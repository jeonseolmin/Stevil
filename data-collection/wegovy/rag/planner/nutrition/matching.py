"""Explicit user goals and deterministic recipe-portion matching."""
from itertools import combinations, product
from copy import deepcopy
import hashlib
import json
import math
from planner.food.policy import (
    choose_diverse_week,
    processed_meat,
)


class NutritionTargetUnavailable(ValueError):
    pass


def number(value):
    try:
        n=float(value)
        return n if math.isfinite(n) and n>=0 else None
    except (ValueError,TypeError): return None


def validate_goal(goal):
    if not goal: return None
    for key,low,high in [('weightKg',20,350),('proteinPerKg',0.1,3),('calories',1000,5000)]:
        value=number(goal.get(key))
        if isinstance(goal.get(key),bool) or value is None or not low<=value<=high:
            raise ValueError('체중·단백질 기준·목표 열량을 확인해 주세요.')
    if goal.get('confirmed') is not True:
        raise ValueError('성인 일반 식사 목표이며 제한 사항을 확인했다는 확인이 필요합니다.')
    protein=goal['weightKg']*goal['proteinPerKg']
    if protein*4>goal['calories']*.35:
        raise ValueError('단백질 목표가 열량의 35%를 넘습니다. 설정을 전문가와 확인해 주세요.')
    return {'calories':float(goal['calories']),'protein':round(protein,1)}


def recipe_nutrition(row):
    weight=number(row.get('INFO_WGT'))
    values=[number(row.get(key)) for key in ('INFO_ENG','INFO_CAR','INFO_PRO','INFO_FAT')]
    if not weight or any(v is None for v in values) or values[0]<=0: return None
    kcal,carbs,protein,fat=values
    # Reject obvious source inconsistencies; do not invent or replace missing values.
    if carbs+protein+fat>weight or abs(carbs*4+protein*4+fat*9-kcal)>max(30,kcal*.3): return None
    return {'calories':kcal,'carbs':carbs,'protein':protein,'fat':fat,'weight':weight}


def proposed_amount(component, factor):
    return max(5, math.floor(float(component['servingWeight']) * factor / 5 + .5) * 5)


def portion_macros(row, factor):
    components = row.get('_evidence', {}).get('components')
    fields=('INFO_ENG','INFO_PRO','INFO_CAR','INFO_FAT')
    if factor == 1 or not components:
        return tuple(float(row[key]) for key in fields)
    return tuple(round(sum(round(float(c['nutrition'][key]) * proposed_amount(c, factor) / float(c['basisWeight']), 4)
                           for c in components), 2) for key in fields)


def portion_totals(row, factor):
    return portion_macros(row, factor)[:2]


# Adult carbohydrate/fat AMDR reference: https://www.ncbi.nlm.nih.gov/books/NBK208874/
# Protein remains the confirmed g/kg goal; +/-20% is a planner matching tolerance.
def macro_penalty(
    carbs,
    protein,
    fat,
    protein_target,
):
    energy = (
        carbs * 4
        + protein * 4
        + fat * 9
    )

    if energy <= 0:
        return float("inf")

    carb_ratio = (
        carbs * 4
        / energy
    )

    fat_ratio = (
        fat * 9
        / energy
    )

    protein_ratio = (
        protein
        / protein_target
    )

    # 탄수화물:
    # 총 에너지의 45~65%
    carb_penalty = max(
        0,
        0.45 - carb_ratio,
        carb_ratio - 0.65,
    )

    # 지방:
    # 총 에너지의 20~35%
    fat_penalty = max(
        0,
        0.20 - fat_ratio,
        fat_ratio - 0.35,
    )

    # 단백질:
    # 목표의 80% 미만은 패널티.
    #
    # 목표 초과 자체는 실패 조건으로 만들지 않습니다.
    # 단, 비정상적으로 높은 값을 막기 위한 상한은
    # 별도 검증에서 처리할 수 있습니다.
    protein_penalty = max(
        0,
        0.80 - protein_ratio,
    )

    return (
        carb_penalty
        + fat_penalty
        + protein_penalty
    )


def balanced_macros(
    carbs,
    protein,
    fat,
    protein_target,
):
    if protein_target <= 0:
        return False

    # 목표의 80%는 최소 확보
    if protein < (
        protein_target
        * 0.80
    ):
        return False

    # 과도한 단백질 후보 방지용
    # Planner-level guardrail.
    #
    # 이것은 개인별 의학적 단백질 처방값이 아니라
    # 자동 조합이 극단적으로 치우치는 것을 막는
    # 기술적 제한입니다.
    if protein > max(
        protein_target * 2.0,
        protein_target + 60,
    ):
        return False

    return (
        macro_penalty(
            carbs,
            protein,
            fat,
            protein_target,
        )
        <= 1e-4
    )


def portion(row, factor):
    """Recalculate proposed amounts from unchanged source nutrition."""
    result = deepcopy(row)
    evidence = result.get('_evidence', {})
    if factor == 1 or not evidence.get('components'):
        return result
    evidence['nutrition'] = dict(evidence['nutrition'])
    for component in evidence['components']:
        amount = proposed_amount(component, factor)
        component['servingWeight'] = str(amount)
        component['amountNutrition'] = {
            key: format(float(value) * amount / float(component['basisWeight']), '.4f')
            if number(value) is not None else '' for key, value in component['nutrition'].items()}
    for key in evidence['nutrition']:
        values = [number(c['amountNutrition'].get(key)) for c in evidence['components']]
        evidence['nutrition'][key] = format(sum(values), '.2f') if all(v is not None for v in values) else ''
    evidence['servingWeight'] = str(round(sum(float(c['servingWeight']) for c in evidence['components']), 4))
    evidence['ingredients'] = '\n'.join(f"{c['name']} {c['servingWeight']}g" for c in evidence['components'])
    evidence['fingerprint'] = hashlib.sha256(json.dumps(evidence['components'], sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    evidence['recipeId'] = 'meal:' + evidence['fingerprint'][:24]
    result.update(evidence['nutrition'])
    result.update(RCP_SEQ=evidence['recipeId'], INFO_WGT=evidence['servingWeight'], RCP_PARTS_DTLS=evidence['ingredients'])
    return result


def balanced_meals(calories, target):
    """Planner distribution limits, not personalized clinical recommendations."""
    return (len(calories) == 3 and min(calories) >= target*.20
            and max(calories) <= min(900, target*.35)
            and max(calories) <= min(calories)*1.5)
def viable_portion_variants(
    row,
    goal,
):
    """
    현재 nutritionGoal에서 이 음식이 한 끼 후보로
    사용할 수 있는 portion variant를 반환합니다.

    match_week()와 동일한 portion 범위를 사용합니다.

    반환 예:
    [
        (
            factor,
            kcal,
            protein,
            carbs,
            fat,
        ),
        ...
    ]

    빈 배열이면 현재 목표에서는
    한 끼 후보로 사용할 수 없습니다.
    """

    target = validate_goal(
        goal
    )

    if target is None:
        return []

    if (
        recipe_nutrition(
            row
        )
        is None
    ):
        return []

    if processed_meat(
        row
    ):
        return []

    choices = []

    # 기존 match_week()와 동일:
    #
    # 0.5배 ~ 1.5배
    # 0.05 단위
    for step in range(
        10,
        31,
    ):
        factor = (
            step
            / 20
        )

        (
            kcal,
            protein,
            carbs,
            fat,
        ) = portion_macros(
            row,
            factor,
        )

        # 기존 match_week()와
        # 반드시 동일한 한 끼 열량 조건을 사용합니다.
        if (
            target[
                "calories"
            ]
            * 0.20
            <= kcal
            <= min(
                900,
                target[
                    "calories"
                ]
                * 0.35,
            )
        ):
            choices.append(
                (
                    factor,
                    kcal,
                    protein,
                    carbs,
                    fat,
                )
            )

    return choices


def is_viable_meal_candidate(
    row,
    goal,
):
    """
    현재 nutritionGoal에서 해당 메뉴를
    실제 한 끼 후보로 사용할 수 있는지 반환합니다.
    """

    return bool(
        viable_portion_variants(
            row,
            goal,
        )
    )

def match_week(
    rows,
    goal,
    snacks=(),
):
    target = validate_goal(
        goal
    )

    eligible = [
        (
            row,
            recipe_nutrition(
                row
            ),
        )
        for row
        in rows
    ]

    eligible = [
        item
        for item
        in eligible
        if (
            item[1] is not None
            and not processed_meat(
                item[0]
            )
        )
    ]

    if len(
        eligible
    ) < 3:
        raise NutritionTargetUnavailable(
            "목표 열량 ±5%, 끼니별 배분, "
            "탄수화물·지방 범위와 최소 단백질 기준을 "
            "함께 충족하는 조합이 없습니다. "
            "음식 후보·제한 또는 목표를 확인해 주세요."
        )

    options = []

    snacks = [
        snack
        for snack
        in snacks
        if not processed_meat(
            snack
        )
    ]

    snack_sets = (
        [()]
        + [
            (
                snack,
            )
            for snack
            in snacks
        ]
        + list(
            combinations(
                snacks,
                2,
            )
        )
    )

    variants = {}

    for row, _ in eligible:
        variants[
            str(
                row[
                    "RCP_SEQ"
                ]
            )
        ] = viable_portion_variants(
            row,
            goal,
        )

    for combo in combinations(
        eligible,
        3,
    ):
        best = None

        for extra in snack_sets:
            extra_kcal = sum(
                float(
                    snack[
                        "foodEvidence"
                    ][
                        "nutrition"
                    ][
                        "INFO_ENG"
                    ]
                )
                for snack
                in extra
            )

            extra_protein = sum(
                float(
                    snack[
                        "foodEvidence"
                    ][
                        "nutrition"
                    ][
                        "INFO_PRO"
                    ]
                )
                for snack
                in extra
            )

            extra_carbs = sum(
                float(
                    snack[
                        "foodEvidence"
                    ][
                        "nutrition"
                    ][
                        "INFO_CAR"
                    ]
                )
                for snack
                in extra
            )

            extra_fat = sum(
                float(
                    snack[
                        "foodEvidence"
                    ][
                        "nutrition"
                    ][
                        "INFO_FAT"
                    ]
                )
                for snack
                in extra
            )

            desired = (
                target[
                    "calories"
                ]
                - extra_kcal
            ) / 3

            choices = [
                sorted(
                    variants[
                        str(
                            row[
                                "RCP_SEQ"
                            ]
                        )
                    ],
                    key=lambda value: (
                        abs(
                            value[1]
                            - desired
                        ),
                        abs(
                            value[0]
                            - 1
                        ),
                    ),
                )[:3]
                for row, _
                in combo
            ]

            if any(
                not group
                for group
                in choices
            ):
                continue

            for selected in product(
                *choices
            ):
                factors = tuple(
                    value[0]
                    for value
                    in selected
                )

                meal_kcal = [
                    value[1]
                    for value
                    in selected
                ]

                total = (
                    sum(
                        meal_kcal
                    )
                    + extra_kcal
                )

                if (
                    not balanced_meals(
                        meal_kcal,
                        target[
                            "calories"
                        ],
                    )
                    or abs(
                        total
                        - target[
                            "calories"
                        ]
                    )
                    > target[
                        "calories"
                    ]
                    * 0.05
                ):
                    continue

                protein = (
                    sum(
                        value[2]
                        for value
                        in selected
                    )
                    + extra_protein
                )

                carbs = (
                    sum(
                        value[3]
                        for value
                        in selected
                    )
                    + extra_carbs
                )

                fat = (
                    sum(
                        value[4]
                        for value
                        in selected
                    )
                    + extra_fat
                )

                if not balanced_macros(
                    carbs,
                    protein,
                    fat,
                    target[
                        "protein"
                    ],
                ):
                    continue

                score = (
                    2
                    * sum(
                        abs(
                            factor
                            - 1
                        )
                        for factor
                        in factors
                    )
                    / 3
                    + 2
                    * (
                        max(
                            meal_kcal
                        )
                        - min(
                            meal_kcal
                        )
                    )
                    / target[
                        "calories"
                    ]
                    + abs(
                        total
                        - target[
                            "calories"
                        ]
                    )
                    / target[
                        "calories"
                    ]
                    + 0.15
                    * abs(
                        protein
                        - target[
                            "protein"
                        ]
                    )
                    / target[
                        "protein"
                    ]
                    + 0.01
                    * len(
                        extra
                    )
                )

                if (
                    best is None
                    or score
                    < best[0]
                ):
                    best = (
                        score,
                        combo,
                        total,
                        protein,
                        factors,
                        extra,
                    )

        if best is not None:
            options.append(
                best
            )

    # =====================================================
    # Debug output
    # =====================================================

    if not options:
        print()
        print(
            "=== Nutrition matching debug ==="
        )

        print(
            "Input rows:",
            len(
                rows
            ),
        )

        print(
            "Nutrition-valid eligible:",
            len(
                eligible
            ),
        )

        print(
            "Target calories:",
            target[
                "calories"
            ],
        )

        print(
            "Target protein:",
            target[
                "protein"
            ],
        )

        print(
            "Available snacks:",
            len(
                snacks
            ),
        )

        print()

        print(
            "--- Eligible foods ---"
        )

        for (
            row,
            nutrition,
        ) in eligible[:30]:
            print(
                row.get(
                    "RCP_SEQ"
                ),
                "|",
                row.get(
                    "RCP_NM"
                ),
                "| kcal:",
                round(
                    nutrition[
                        "calories"
                    ],
                    2,
                ),
                "| carb:",
                round(
                    nutrition[
                        "carbs"
                    ],
                    2,
                ),
                "| protein:",
                round(
                    nutrition[
                        "protein"
                    ],
                    2,
                ),
                "| fat:",
                round(
                    nutrition[
                        "fat"
                    ],
                    2,
                ),
                "| portion variants:",
                len(
                    variants.get(
                        str(
                            row.get(
                                "RCP_SEQ"
                            )
                        ),
                        [],
                    )
                ),
            )

        print()

        print(
            "--- Snack candidates ---"
        )

        for snack in snacks:
            nutrition = (
                snack.get(
                    "foodEvidence",
                    {}
                ).get(
                    "nutrition",
                    {}
                )
            )

            print(
                snack.get(
                    "id"
                ),
                "|",
                snack.get(
                    "title"
                ),
                "| kcal:",
                nutrition.get(
                    "INFO_ENG"
                ),
                "| carb:",
                nutrition.get(
                    "INFO_CAR"
                ),
                "| protein:",
                nutrition.get(
                    "INFO_PRO"
                ),
                "| fat:",
                nutrition.get(
                    "INFO_FAT"
                ),
            )

        print(
            "=== End nutrition debug ==="
        )

        print()

        raise NutritionTargetUnavailable(
            "목표 열량 ±5%, 끼니별 배분, "
            "탄수화물·지방 범위와 최소 단백질 기준을 "
            "함께 충족하는 조합이 없습니다. "
            "음식 후보·제한 또는 목표를 확인해 주세요."
        )

    # =====================================================
    # Weekly diversity selection
    # =====================================================

    days = []

    notices = []

    for (
        day,
        (
            score,
            combo,
            kcal,
            protein,
            factors,
            extra,
        ),
    ) in enumerate(
        choose_diverse_week(
            options
        )
    ):
        meals = sorted(
            [
                portion(
                    row,
                    factor,
                )
                for (
                    row,
                    _
                ),
                factor
                in zip(
                    combo,
                    factors,
                )
            ],
            key=lambda row:
                float(
                    row[
                        "INFO_ENG"
                    ]
                ),
        )

        meals[0][
            "_plannedSnacks"
        ] = list(
            extra
        )

        days.append(
            meals
        )

        notices.append(
            (
                f"{day + 1}일차 추천: "
                f"세 끼 "
                f"{' / '.join(str(round(float(row['INFO_ENG']))) for row in meals)} kcal "
                f"· 간식 {len(extra)}개 "
                f"· 합계 {kcal:.0f} kcal "
                f"/ 단백질 {protein:.1f}g. "
                "표시된 제안량 기준입니다."
            )
        )

    return (
        days,
        notices,
    )
