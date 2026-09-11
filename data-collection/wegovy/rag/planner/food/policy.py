"""Runtime food selection rules; source records and embeddings stay unchanged."""
from collections import Counter
import re
import unicodedata


class FoodPolicyUnavailable(ValueError):
    pass


PROCESSED_MEAT = re.compile(
    r'런[천쳔]미트|스팸|베이컨|소[시세]지|비엔나|살라미|페퍼로니|햄(?!프|버거|스터)'
    r'|\b(?:luncheon\s*meat|spam|bacon|sausages?|salami|pepperoni|ham)\b', re.I)
FAMILIES = (
    # =====================================================
    # Meat
    # =====================================================

    (
        'chicken',
        r'닭|치킨|chicken',
    ),

    (
        'pork',
        r'돼지|돈육|제육|삼겹|목살|족발|pork',
    ),

    (
        'beef',
        r'소고기|쇠고기|우육|한우|beef',
    ),

    (
        'duck',
        r'오리|duck',
    ),


    # =====================================================
    # Plant / egg
    # =====================================================

    (
        'soy',
        r'두부|콩(?!나물)|대두|tofu|soy',
    ),

    (
        'egg',
        r'계란|달걀|달[걀걱]|egg',
    ),


    # =====================================================
    # Fish
    # =====================================================

    (
        'mackerel',
        r'고등어|삼치|mackerel',
    ),

    (
        'salmon',
        r'연어|salmon',
    ),

    (
        'pollock',
        r'명태|동태|생태|황태|북어|코다리|pollock',
    ),

    (
        'croaker',
        r'조기|굴비|croaker',
    ),

    (
        'hairtail',
        r'갈치|hairtail',
    ),

    (
        'flatfish',
        r'가자미|광어|도다리|flatfish|flounder',
    ),

    (
        'tuna',
        r'참치|다랑어|tuna',
    ),

    (
        'anchovy',
        r'멸치|anchovy',
    ),

    (
        'eel',
        r'장어|붕장어|민물장어|eel',
    ),

    (
        'saury',
        r'꽁치|saury',
    ),


    # =====================================================
    # Seafood
    # =====================================================

    (
        'shrimp',
        r'새우|대하|shrimp|prawn',
    ),

    (
        'squid',
        r'오징어|한치|squid',
    ),

    (
        'octopus',
        r'낙지|문어|주꾸미|쭈꾸미|octopus',
    ),

    (
        'shellfish',
        r'조개|홍합|꼬막|바지락|전복|가리비|shellfish',
    ),
)


def canonical(name):
    return re.sub(r'[\W_]+', '', unicodedata.normalize('NFKC', str(name).split('_',1)[0].replace('쇠고기','소고기').replace('달걀','계란'))).lower()


def families(name):
    return {key for key, pattern in FAMILIES if re.search(pattern, str(name), re.I)}


def food_text(row):
    evidence = row.get('_evidence') or row.get('foodEvidence') or {}
    return ' '.join(str(v) for v in [row.get('name',''),row.get('RCP_NM',''),row.get('title',''),
                    row.get('RCP_PARTS_DTLS',''),evidence.get('ingredients',''),
                    *[c.get('name','') for c in evidence.get('components',[])]])


def processed_meat(row):
    return bool(PROCESSED_MEAT.search(food_text(row)))


def main_food_keys(row):
    evidence = row.get('_evidence') or row.get('foodEvidence') or {}
    protein = [c['name'] for c in evidence.get('components',[]) if c.get('role')=='protein']
    names = protein or [row.get('RCP_NM') or row.get('title') or row.get('name') or str(row.get('RCP_SEQ',''))]
    dishes = {canonical(n) for n in names if n}
    groups = set().union(*(families(n) for n in names))
    # Recipe titles do not always name the protein. Use declared ingredients as fallback.
    if not groups and not protein:
        groups = families(row.get('RCP_PARTS_DTLS') or evidence.get('ingredients',''))
    return dishes, groups


def diverse_recipe_candidates(rows, limit=40):
    remaining=[(index,row,*main_food_keys(row)) for index,row in enumerate(rows)]
    selected=[];seen=set();usage=Counter()
    while remaining and len(selected)<limit:
        item=min(remaining,key=lambda item:(sum(usage[k] for k in item[3]),item[0]))
        remaining.remove(item)
        _,row,dishes,groups=item
        if seen.intersection(dishes): continue
        selected.append(row);seen.update(dishes);usage.update(groups)
    return selected


def choose_diverse_week(options):
    """Bounded beam search avoids a greedy early choice exhausting later days."""
    prepared = []

    for item in options:
        rows = [
            row
            for row, _
            in item[1]
        ]

        if any(
            processed_meat(row)
            for row in rows
        ):
            continue

        dishes = Counter()
        groups = Counter()

        for row in rows:
            d, g = main_food_keys(row)

            dishes.update(d)
            groups.update(g)

        # 같은 정확한 메뉴는 하루에 중복하지 않음.
        #
        # 주요 단백질 family는
        # 하루 최대 2회까지 허용합니다.
        #
        # 예:
        # 닭가슴살 덮밥 + 닭고기 샐러드까지는 허용 가능하지만
        # 하루 세 끼가 모두 chicken family인 경우는 제외합니다.
        if (
            max(
                dishes.values(),
                default=0,
            ) > 1
            or max(
                groups.values(),
                default=0,
            ) > 2
        ):
            continue

        prepared.append(
            (
                item,
                dishes,
                groups,
            )
        )

    states = [
        (
            0.0,
            [],
            Counter(),
            Counter(),
        )
    ]

    for _ in range(7):
        successors = {}

        for (
            score,
            chosen,
            used_dishes,
            used_groups,
        ) in states:

            candidates = []

            for (
                item,
                dishes,
                groups,
            ) in prepared:

                # 같은 정확한 메뉴는
                # 주 최대 2회.
                if any(
                    used_dishes[k] + n > 2
                    for k, n
                    in dishes.items()
                ):
                    continue

                # 같은 주요 단백질 family는
                # 주 최대 5회.
                if any(
                    used_groups[k] + n > 5
                    for k, n
                    in groups.items()
                ):
                    continue

                rank = (
                    item[0]
                    + 0.1
                    * sum(
                        used_groups[k]
                        for k
                        in groups
                    )
                )

                candidates.append(
                    (
                        rank,
                        item,
                        dishes,
                        groups,
                    )
                )

            for (
                rank,
                item,
                dishes,
                groups,
            ) in sorted(
                candidates,
                key=lambda candidate:
                    candidate[0],
            )[:24]:

                next_dishes = (
                    used_dishes
                    + dishes
                )

                next_groups = (
                    used_groups
                    + groups
                )

                signature = (
                    tuple(
                        sorted(
                            next_dishes.items()
                        )
                    ),
                    tuple(
                        sorted(
                            next_groups.items()
                        )
                    ),
                )

                state = (
                    score + rank,
                    chosen + [item],
                    next_dishes,
                    next_groups,
                )

                if (
                    signature
                    not in successors
                    or state[0]
                    < successors[
                        signature
                    ][0]
                ):
                    successors[
                        signature
                    ] = state

        states = sorted(
            successors.values(),
            key=lambda state:
                state[0],
        )[:24]

        if not states:
            raise FoodPolicyUnavailable(
                "영양 조건과 음식 다양성을 함께 충족할 후보가 부족합니다. "
                "같은 반찬은 주 2회, "
                "같은 주요 단백질 재료는 하루 2회·주 5회 이내로 배치합니다. "
                "음식 선호·제한 또는 후보 구성을 확인해 주세요."
            )

    return states[0][1]


def validate_food_policy(events):
    dishes = Counter()
    groups = Counter()
    daily = {}

    for event in events:
        if event.get("kind") not in (
            "MEAL",
            "SNACK",
        ):
            continue

        if processed_meat(event):
            raise FoodPolicyUnavailable(
                "가공육이 포함된 음식은 기본 자동 식단에서 제외합니다."
            )

        # 간식 반복은 허용하고,
        # 식사의 주요 단백질/메뉴 반복만 검사합니다.
        if event["kind"] != "MEAL":
            continue

        d, g = main_food_keys(event)

        dishes.update(d)
        groups.update(g)

        day = event["start"][:10]

        daily.setdefault(
            day,
            Counter(),
        ).update(g)

        # 같은 정확한 메뉴:
        # 주 최대 2회
        #
        # 같은 주요 단백질 family:
        # 하루 최대 2회
        # 주 최대 5회
        if any(
            dishes[key] > 2
            for key in d
        ) or any(
            groups[key] > 5
            or daily[day][key] > 2
            for key in g
        ):
            raise FoodPolicyUnavailable(
                "같은 반찬 또는 주요 단백질 재료가 반복되어 "
                "식단을 반환하지 않았습니다. "
                "같은 반찬은 주 2회, "
                "같은 주요 단백질 재료는 하루 2회·주 5회 이내로 "
                "후보를 다양하게 선택해 다시 생성해 주세요."
            )
