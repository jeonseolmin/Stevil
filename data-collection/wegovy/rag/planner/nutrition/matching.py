"""Explicit user goals and deterministic recipe-portion matching."""
from itertools import combinations, product
from copy import deepcopy
import hashlib
import json
import math
import time
from planner.food.policy import (
    choose_diverse_week,
    processed_meat,
)


class NutritionTargetUnavailable(ValueError):
    pass


# Timing/counter measurement only (Phase8); never gates or changes results.
def _log_timing(label, seconds):
    print(f'[PLANNER TIMING] {label}={seconds:.3f}s', flush=True)


# =========================================================
# match_week() search-space policy (Phase10)
#
# These bound how many food/snack candidates match_week() explores.
# They exist purely to keep the O(E^3 * S^2) combinatorial search
# tractable -- they are NOT medical or nutrition limits.
# =========================================================

MAX_MATCH_FOOD_CANDIDATES = 20
MAX_MATCH_SNACK_CANDIDATES = 12


def _cap_snacks_by_category_quota(snacks, limit):
    """
    전역 priority top-K가 아니라 카테고리 quota로 snack 후보를 limit개로 줄인다.

    각 카테고리 안에서는 기존에 이미 들어온 순서(= DB category,priority,title
    정렬 순서)를 그대로 존중해 앞쪽(우선순위 높은) 항목부터 담는다. 카테고리
    사이의 나머지 자리 배분은 새 영양/카테고리 기준을 만들지 않기 위해
    입력 리스트에 카테고리가 처음 등장하는 순서를 그대로 사용한다(입력 자체가
    이미 결정적으로 정렬돼 들어오므로 별도 판단을 추가하지 않는다).
    """
    if limit <= 0 or len(snacks) <= limit:
        return list(snacks)

    by_category = {}
    category_order = []

    for snack in snacks:
        category = snack.get('category')
        if category not in by_category:
            by_category[category] = []
            category_order.append(category)
        by_category[category].append(snack)

    base = limit // len(category_order)
    remainder = limit % len(category_order)

    selected_ids = set()
    selected = []

    for index, category in enumerate(category_order):
        quota = base + (1 if index < remainder else 0)
        for snack in by_category[category][:quota]:
            selected_ids.add(id(snack))
            selected.append(snack)

    if len(selected) < limit:
        for snack in snacks:
            if len(selected) >= limit:
                break
            if id(snack) not in selected_ids:
                selected_ids.add(id(snack))
                selected.append(snack)

    # 원래 (category, priority, title) 순서를 그대로 보존해서 반환한다.
    return [snack for snack in snacks if id(snack) in selected_ids]


def number(value):
    try:
        n=float(value)
        return n if math.isfinite(n) and n>=0 else None
    except (ValueError,TypeError): return None


def validate_goal(goal):
    if not goal: return None
    for key,low,high in [('weightKg',20,350),('proteinPerKg',0.1,3)]:
        value=number(goal.get(key))
        if isinstance(goal.get(key),bool) or value is None or not low<=value<=high:
            raise ValueError('체중·단백질 기준·목표 열량을 확인해 주세요.')
    # calories는 Stevil 서비스 하한(1200kcal)만 두고 상한은 없다.
    calories=number(goal.get('calories'))
    if isinstance(goal.get('calories'),bool) or calories is None or calories<1200:
        raise ValueError('체중·단백질 기준·목표 열량을 확인해 주세요.')
    if goal.get('confirmed') is not True:
        raise ValueError('성인 일반 식사 목표이며 제한 사항을 확인했다는 확인이 필요합니다.')
    protein=goal['weightKg']*goal['proteinPerKg']
    # 35% is a Stevil soft management guideline; hard validation is intentionally not applied here.
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


def _protein_bounds(protein_target):
    """
    balanced_macros()가 판정에 쓰는 것과 동일한 단백질 허용 범위.

    새 기준이 아니라, balanced_macros() 안에 있던 동일한 두 상수(0.80,
    2.0/+60)를 재사용 목적으로 뽑아낸 것뿐이다(Phase10 lossless interval
    pruning에서 재사용).
    """
    return (
        protein_target * 0.80,
        max(
            protein_target * 2.0,
            protein_target + 60,
        ),
    )


def balanced_macros(
    carbs,
    protein,
    fat,
    protein_target,
):
    if protein_target <= 0:
        return False

    required_min, allowed_max = _protein_bounds(
        protein_target
    )

    # 목표의 80%는 최소 확보
    if protein < required_min:
        return False

    # 과도한 단백질 후보 방지용
    # Planner-level guardrail.
    #
    # 이것은 개인별 의학적 단백질 처방값이 아니라
    # 자동 조합이 극단적으로 치우치는 것을 막는
    # 기술적 제한입니다.
    if protein > allowed_max:
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
    nutrition=None,
    target=None,
):
    """
    현재 nutritionGoal에서 이 음식이 한 끼 후보로
    사용할 수 있는 portion variant를 반환합니다.

    match_week()와 동일한 portion 범위를 사용합니다.

    nutrition/target을 호출자가 이미 계산해뒀다면(match_week()의 eligible
    구성 시처럼) 넘겨서 recipe_nutrition()/processed_meat()/validate_goal()
    재계산을 건너뛸 수 있다(Phase10). 기본값(None)일 때는 기존과 완전히
    동일하게 매번 새로 계산한다 -- is_viable_meal_candidate() 등 기존
    호출부의 동작은 바뀌지 않는다.

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

    if target is None:
        target = validate_goal(
            goal
        )

    if target is None:
        return []

    if nutrition is None:
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
    _mw_t0 = time.perf_counter()

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

    # Phase10: search-space caps (performance policy, not medical/nutrition;
    # see MAX_MATCH_FOOD_CANDIDATES/MAX_MATCH_SNACK_CANDIDATES).
    #
    # Food keeps its existing incoming order (vector relevance -> diversity
    # selection -> Gemini eligible selection / grounded supplement, all
    # decided upstream before match_week() is called) and only the top
    # MAX_MATCH_FOOD_CANDIDATES are searched. No new ranking is introduced.
    _mw_eligible_before_cap = len(eligible)

    eligible = eligible[
        :MAX_MATCH_FOOD_CANDIDATES
    ]

    _mw_eligible_after_cap = len(eligible)

    _mw_snacks_before_cap = len(snacks)

    snacks = _cap_snacks_by_category_quota(
        snacks,
        MAX_MATCH_SNACK_CANDIDATES,
    )

    _mw_snacks_after_cap = len(snacks)

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

    # Top1 (Phase8/9 design, lossless): extra_kcal/protein/carbs/fat/desired
    # depend only on the snack_set, never on which 3 foods are being
    # evaluated. Precompute once per snack_set instead of once per
    # (combo, snack_set) -- identical values, computed 원래 횟수(combo 수)만큼이
    # 아니라 snack_set 수만큼만.
    extra_totals = []

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

        extra_totals.append(
            (
                extra_kcal,
                extra_protein,
                extra_carbs,
                extra_fat,
                desired,
            )
        )

    variants = {}

    for row, nutrition in eligible:
        variants[
            str(
                row[
                    "RCP_SEQ"
                ]
            )
        ] = viable_portion_variants(
            row,
            goal,
            nutrition=nutrition,
            target=target,
        )

    _log_timing('match_week.prepare', time.perf_counter() - _mw_t0)

    # Top2 (Phase8/9 design, lossless): the sorted top-3 portion choices
    # for a food only depend on (food, desired), and desired only depends
    # on the snack_set index -- never on which other 2 foods share the
    # combo. Precompute once per (food, snack_set) instead of once per
    # (combo, snack_set); same sort key, same input list, same result.
    #
    # kcal/protein min/max per entry are also cached here for the lossless
    # interval pruning below (still derived from the same top-3 list).
    _mw_t_choice_cache_start = time.perf_counter()

    choice_cache = {}

    for row, _ in eligible:
        food_id = str(
            row[
                "RCP_SEQ"
            ]
        )

        food_variants = variants[
            food_id
        ]

        for index, (
            extra_kcal,
            extra_protein,
            extra_carbs,
            extra_fat,
            desired,
        ) in enumerate(
            extra_totals
        ):
            top3 = sorted(
                food_variants,
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

            if top3:
                kcal_values = [
                    value[1]
                    for value
                    in top3
                ]

                protein_values = [
                    value[2]
                    for value
                    in top3
                ]

                choice_cache[
                    (food_id, index)
                ] = (
                    top3,
                    min(kcal_values),
                    max(kcal_values),
                    min(protein_values),
                    max(protein_values),
                )
            else:
                choice_cache[
                    (food_id, index)
                ] = (
                    (),
                    None,
                    None,
                    None,
                    None,
                )

    _log_timing('match_week.choice_cache', time.perf_counter() - _mw_t_choice_cache_start)

    # Phase8 measurement only: counters/accumulators, never used to
    # change which combination is selected.
    _mw_combo_count = 0
    _mw_combo_extra_pairs = 0
    _mw_empty_choices_skips = 0
    _mw_interval_pruned_pairs = 0
    _mw_product_evals = 0
    _mw_calorie_window_rejects = 0
    _mw_macro_rejects = 0
    _mw_score_evals = 0
    _mw_best_updates = 0
    _mw_t_product_eval = 0.0
    _mw_t_combinations_start = time.perf_counter()

    # Phase10 lossless interval pruning bounds. These reuse the exact same
    # thresholds the unpruned loop below already enforces per-selection
    # (balanced_macros' protein range via _protein_bounds(), and the
    # +-5% calorie-total check) -- never a new/different threshold.
    _mw_protein_required_min, _mw_protein_allowed_max = _protein_bounds(
        target[
            "protein"
        ]
    )

    _mw_allowed_calorie_min = (
        target["calories"] * 0.95
    )

    _mw_allowed_calorie_max = (
        target["calories"] * 1.05
    )

    for combo in combinations(
        eligible,
        3,
    ):
        _mw_combo_count += 1

        best = None

        food_ids = [
            str(
                row[
                    "RCP_SEQ"
                ]
            )
            for row, _
            in combo
        ]

        for index, extra in enumerate(
            snack_sets
        ):
            _mw_combo_extra_pairs += 1

            (
                extra_kcal,
                extra_protein,
                extra_carbs,
                extra_fat,
                desired,
            ) = extra_totals[index]

            entries = [
                choice_cache[
                    (food_id, index)
                ]
                for food_id
                in food_ids
            ]

            if any(
                not entry[0]
                for entry
                in entries
            ):
                _mw_empty_choices_skips += 1
                continue

            # Lossless calorie-sum pruning: if even the best-case sum of
            # each food's own min/max can't land within +-5% of target,
            # no selection from product(*choices) could either -- the
            # unpruned loop would reject every one of them anyway.
            kcal_min = (
                sum(
                    entry[1]
                    for entry
                    in entries
                )
                + extra_kcal
            )

            kcal_max = (
                sum(
                    entry[2]
                    for entry
                    in entries
                )
                + extra_kcal
            )

            if (
                kcal_max < _mw_allowed_calorie_min
                or kcal_min > _mw_allowed_calorie_max
            ):
                _mw_interval_pruned_pairs += 1
                continue

            # Lossless protein-bound pruning: same reasoning, using the
            # exact balanced_macros() protein range via _protein_bounds().
            protein_min = (
                sum(
                    entry[3]
                    for entry
                    in entries
                )
                + extra_protein
            )

            protein_max = (
                sum(
                    entry[4]
                    for entry
                    in entries
                )
                + extra_protein
            )

            if (
                protein_max < _mw_protein_required_min
                or protein_min > _mw_protein_allowed_max
            ):
                _mw_interval_pruned_pairs += 1
                continue

            choices = [
                entry[0]
                for entry
                in entries
            ]

            _mw_t_product_start = time.perf_counter()

            for selected in product(
                *choices
            ):
                _mw_product_evals += 1

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
                    _mw_calorie_window_rejects += 1
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
                    _mw_macro_rejects += 1
                    continue

                _mw_score_evals += 1

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

                    _mw_best_updates += 1

            _mw_t_product_eval += time.perf_counter() - _mw_t_product_start

        if best is not None:
            options.append(
                best
            )

    _log_timing('match_week.combinations', time.perf_counter() - _mw_t_combinations_start)
    _log_timing('match_week.combinations.product_eval', _mw_t_product_eval)

    print(
        '[PLANNER TIMING] match_week.counts '
        f'eligible_before_cap={_mw_eligible_before_cap} eligible_after_cap={_mw_eligible_after_cap} '
        f'snacks_before_cap={_mw_snacks_before_cap} snacks_after_cap={_mw_snacks_after_cap} '
        f'snack_sets={len(snack_sets)} '
        f'combos={_mw_combo_count} combo_extra_pairs={_mw_combo_extra_pairs} '
        f'empty_choices_skips={_mw_empty_choices_skips} interval_pruned_pairs={_mw_interval_pruned_pairs} '
        f'product_evals={_mw_product_evals} '
        f'calorie_window_rejects={_mw_calorie_window_rejects} macro_rejects={_mw_macro_rejects} '
        f'score_evals={_mw_score_evals} best_updates={_mw_best_updates} options={len(options)}',
        flush=True,
    )

    _mw_t_selection_start = time.perf_counter()

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

    _log_timing('match_week.selection', time.perf_counter() - _mw_t_selection_start)
    _log_timing('match_week.total', time.perf_counter() - _mw_t0)

    return (
        days,
        notices,
    )
