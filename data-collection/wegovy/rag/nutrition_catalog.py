"""MFDS nutrient snapshots and portion-based meals; never join recipes by name."""
import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
from itertools import product
import json
import os
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlencode, unquote
from urllib.request import urlopen

from hybrid import VectorIndex
from food_policy import processed_meat, families, canonical
from nutrition import number, recipe_nutrition, validate_goal, macro_penalty

ROOT = Path(__file__).parent / 'cache' / 'nutrition'
SOURCE = 'https://www.data.go.kr/data/15127578/openapi.do'
ENDPOINT = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02'
FIELDS = {'INFO_ENG': 'AMT_NUM1', 'INFO_CAR': 'AMT_NUM6', 'INFO_PRO': 'AMT_NUM3',
          'INFO_FAT': 'AMT_NUM4', 'INFO_NA': 'AMT_NUM13'}
# Proposed serving amounts, not source-reported servings or medical prescriptions.
PORTIONS = {'staple': (150, 200, 250), 'protein': (75, 100, 125), 'vegetable': (60, 80, 100)}
# =========================================================
# Meal quality guardrails
# =========================================================

# WHO의 일반 성인 sodium 권고를 참고한
# planner-level reference입니다.
#
# 자동 식단에서는 이 값을 개인별 처방값으로 사용하지 않고,
# 나트륨이 과도하게 높은 조합을 피하기 위한 품질 기준으로만 씁니다.
DAILY_SODIUM_REFERENCE_MG = 2000

# 한 끼 soft target.
# 초과해도 바로 제외하지 않고 score penalty를 줍니다.
MEAL_SODIUM_SOFT_MG = (
    DAILY_SODIUM_REFERENCE_MG
    / 3
)

# 이 정도로 매우 높은 한 끼는
# 기본 자동 식단 후보에서 제외합니다.
MEAL_SODIUM_HARD_MG = 1500


# 식단의 '주요 단백질 반찬'으로 인정할 음식명입니다.
PROTEIN_FOOD_PATTERN = re.compile(
    r"닭|치킨|돼지|돈육|제육|삼겹|목살|"
    r"소고기|쇠고기|우육|한우|"
    r"오리|"
    r"계란|달걀|"
    r"두부|콩|대두|"
    r"생선|고등어|삼치|꽁치|갈치|조기|병어|"
    r"연어|장어|명태|동태|황태|북어|코다리|"
    r"참치|다랑어|"
    r"새우|대하|오징어|낙지|문어|주꾸미|쭈꾸미|"
    r"조개|꼬막|홍합|바지락|전복|가리비|"
    r"족발|함박|미트볼|스테이크",
    re.I,
)

def diverse_foods(rows, limit=12):
    """Share the shortlist across cooking categories; source-name variants get one slot."""
    selected = []; seen_names = set(); category_usage = {}; family_usage = {}
    remaining = list(enumerate(rows))
    while remaining and len(selected) < limit:
        rank, row = min(remaining, key=lambda item: (sum(family_usage.get(k,0) for k in families(item[1]['name'])), category_usage.get(item[1]['category'], 0), item[0]))
        remaining.remove((rank, row))
        family = canonical(row['name'])
        if family in seen_names:
            continue
        selected.append(row); seen_names.add(family)
        for key in families(row['name']): family_usage[key]=family_usage.get(key,0)+1
        category_usage[row['category']] = category_usage.get(row['category'], 0) + 1
    return selected


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def grams(value):
    """Require an explicit mass unit; ml and unitless values need separate review."""
    match = re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*g\s*', str(value), re.I)
    return float(match[1]) if match and float(match[1]) > 0 else None


def nutrient_text(value):
    """Canonical numeric text; only valid thousands groups may be removed."""
    value = str(value).strip()
    if re.fullmatch(r'(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?', value):
        return value.replace(',', '')
    return ''


def normalize(row):
    if (
        row.get(
            "DB_GRP_NM"
        )
        != "음식"
    ):
        return (
            None,
            "not_prepared_food",
        )

    if (
        not row.get(
            "FOOD_CD"
        )
        or not row.get(
            "FOOD_NM_KR"
        )
    ):
        return (
            None,
            "missing_identity",
        )

    basis = grams(
        row.get(
            "SERVING_SIZE"
        )
    )

    if basis is None:
        return (
            None,
            "unsupported_basis",
        )

    nutrients = {
        key:
            nutrient_text(
                row.get(
                    source,
                    "",
                )
            )
        for key, source
        in FIELDS.items()
    }

    n = recipe_nutrition(
        {
            "INFO_WGT":
                basis,

            **nutrients,
        }
    )

    if n is None:
        return (
            None,
            "missing_or_inconsistent_nutrition",
        )

    title = str(
        row[
            "FOOD_NM_KR"
        ]
    )

    category = str(
        row.get(
            "FOOD_CAT1_NM",
            "",
        )
    )

    protein100 = (
        n[
            "protein"
        ]
        * 100
        / basis
    )

    role = None

    # =====================================================
    # Staple
    # =====================================================

    if (
        "밥"
        in category

        and re.search(
            (
                r"쌀밥|잡곡밥|현미밥|보리밥|"
                r"흑미밥|기장밥|수수밥|콩밥|"
                r"팥밥|율무밥|조밥|오곡밥|찰밥|백미밥"
            ),
            title,
        )

        and not re.search(
            (
                r"비빔|볶음|덮밥|김밥|초밥|"
                r"국밥|주먹|리소토|오므라이스"
            ),
            title,
        )

        and (
            n[
                "carbs"
            ]
            * 4
            / n[
                "calories"
            ]
            >= 0.65
        )

        and (
            n[
                "fat"
            ]
            * 9
            / n[
                "calories"
            ]
            < 0.20
        )
    ):
        role = (
            "staple"
        )

    # =====================================================
    # Protein
    #
    # 이전:
    # 찜/구이 등의 카테고리 +
    # protein >= 8g/100g 이면 모두 protein
    #
    # 문제:
    # 애호박찜 같은 음식도 protein으로 분류될 수 있었음.
    #
    # 변경:
    # 실제 단백질 식품명 패턴도 동시에 확인합니다.
    # =====================================================

    elif (
        any(
            word
            in category
            for word
            in (
                "구이",
                "찜",
                "조림",
                "볶음",
                "부침",
                "전류",
            )
        )

        and protein100
        >= 8

        and PROTEIN_FOOD_PATTERN.search(
            title
        )
    ):
        role = (
            "protein"
        )

    # =====================================================
    # Vegetable
    # =====================================================

    elif (
        any(
            word
            in category
            for word
            in (
                "나물",
                "숙채",
                "생채",
                "무침",
            )
        )

        and protein100
        < 8

        and not re.search(
            (
                r"오징어|낙지|문어|쭈꾸미|주꾸미|"
                r"골뱅이|소라|조개|홍합|꼬막|"
                r"해파리|북어|황태|명태|멸치|"
                r"새우|어묵|고기|족발|순대|"
                r"닭|돼지|쇠고기|소고기"
            ),
            title,
        )
    ):
        role = (
            "vegetable"
        )

    if role is None:
        return (
            None,
            "not_meal_component",
        )

    return (
        {
            "id":
                str(
                    row[
                        "FOOD_CD"
                    ]
                ),

            "name":
                title,

            "category":
                category,

            "role":
                role,

            "basisWeight":
                basis,

            "nutrition":
                nutrients,

            "fingerprint":
                digest(
                    row
                ),
        },

        None,
    )
def sodium_for_amount(
    row,
    amount,
):
    sodium = number(
        row[
            "nutrition"
        ].get(
            "INFO_NA"
        )
    )

    if sodium is None:
        return None

    return (
        sodium
        * amount
        / row[
            "basisWeight"
        ]
    )


def meal_sodium(
    rows,
    amounts,
):
    values = [
        sodium_for_amount(
            row,
            amount,
        )
        for row, amount
        in zip(
            rows,
            amounts,
        )
    ]

    if any(
        value is None
        for value
        in values
    ):
        return None

    return sum(
        values
    )

def revalidate(root=ROOT):
    with closing(sqlite3.connect(root / 'foods.sqlite3')) as db:
        rows = [json.loads(raw) for raw, in db.execute('SELECT raw FROM foods')]
        with db:
            ingest(db, rows)


def parse_page(payload):
    data = payload.get('response', payload)
    if str(data.get('header', {}).get('resultCode')) not in ('00', '0'):
        raise RuntimeError('영양정보 API 인증·활용신청 또는 호출 한도를 확인해 주세요.')
    body = data['body']
    rows = body.get('items') or []
    if isinstance(rows, dict):
        rows = rows.get('item') or []
    if isinstance(rows, dict):
        rows = [rows]
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ValueError('영양정보 API 항목 형식이 변경되었습니다.')
    return rows, int(body['totalCount'])


def initialize(db):
    db.execute('CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS foods (id TEXT PRIMARY KEY, raw TEXT NOT NULL, normalized TEXT, exclusion TEXT)')


def ingest(db, rows):
    for row in rows:
        if not row.get('FOOD_CD'):
            raise ValueError('식품코드가 없는 API 자료입니다.')
        food, exclusion = normalize(row)
        db.execute('INSERT OR REPLACE INTO foods VALUES (?, ?, ?, ?)',
                   (str(row['FOOD_CD']), json.dumps(row, ensure_ascii=False),
                    json.dumps(food, ensure_ascii=False) if food else None, exclusion))


def collect(root=ROOT):
    key = os.environ.get('FOOD_NUTRITION_API_KEY', '').strip()
    if not key:
        raise ValueError('rag/.env에 FOOD_NUTRITION_API_KEY를 설정해 주세요. 공공데이터포털의 별도 활용신청이 필요합니다.')
    root.mkdir(parents=True, exist_ok=True)
    staging = root / 'collecting.sqlite3'
    with closing(sqlite3.connect(staging)) as db:
        initialize(db)
        metadata = dict(db.execute('SELECT key,value FROM metadata'))
        categories = ('밥류', '구이류', '찜류', '조림류', '볶음류', '나물·숙채류', '생채·무침류')
        retrieved = metadata.get('retrievedAt', datetime.now(timezone.utc).isoformat())
        for index in range(int(metadata.get('nextCategory', '0')), len(categories)):
            category = categories[index]
            page = int(metadata.get('nextPage', '1'))
            while page <= 1000:
                query = urlencode({'serviceKey': unquote(key), 'pageNo': page, 'numOfRows': 500,
                                   'type': 'json', 'FOOD_CAT1_NM': category})
                try:
                    with urlopen(ENDPOINT + '?' + query, timeout=45) as response:
                        rows, total = parse_page(json.load(response))
                except (OSError, ValueError, KeyError) as error:
                    raise RuntimeError(f'영양정보 수집 실패({type(error).__name__}). 저장된 페이지부터 재시도할 수 있습니다.') from None
                old_total = metadata.get('categoryTotal')
                if old_total is not None and int(old_total) != total:
                    raise RuntimeError('수집 중 원본 건수가 바뀌었습니다. collecting.sqlite3를 별도로 보관한 뒤 다시 수집해 주세요.')
                expected = min(500, total - (page - 1) * 500)
                if total <= 0 or len(rows) != expected:
                    raise RuntimeError('영양정보 페이지의 건수가 일치하지 않습니다. 기존 DB를 유지합니다.')
                finished = page * 500 >= total
                with db:
                    ingest(db, rows)
                    metadata.update(nextPage=str(page + 1), nextCategory=str(index), retrievedAt=retrieved, categoryTotal=str(total))
                    if finished:
                        metadata.update(nextCategory=str(index+1), nextPage='1')
                        metadata.pop('categoryTotal', None)
                        db.execute("DELETE FROM metadata WHERE key='categoryTotal'")
                    db.executemany('INSERT OR REPLACE INTO metadata VALUES (?, ?)', metadata.items())
                print(f'Nutrient category {index+1}/{len(categories)}: page {page}, {total} source rows', flush=True)
                if finished:
                    break
                page += 1
            else:
                raise RuntimeError('수집 페이지 상한에 도달했습니다. 기존 DB를 유지합니다.')
        with db:
            db.execute("INSERT OR REPLACE INTO metadata VALUES ('categories', ?)", (json.dumps(categories, ensure_ascii=False),))
    staging.replace(root / 'foods.sqlite3')


class NutrientCatalog:
    def __init__(self, root=ROOT):
        self.root = root
        with closing(sqlite3.connect((root / 'foods.sqlite3').resolve().as_uri() + '?mode=ro', uri=True)) as db:
            self.metadata = dict(db.execute('SELECT key,value FROM metadata'))
            self.rows = {food['id']: food for encoded, in db.execute('SELECT normalized FROM foods WHERE normalized IS NOT NULL')
                         for food in [json.loads(encoded)]}
        docs = [{'id': r['id'], 'section': r['name'], 'text': f"{r['name']} {r['category']} {r['role']}"} for r in self.rows.values()]
        self.index = VectorIndex(docs, root / 'embeddings.sqlite3')

    def component(self, row, amount):
        scale = amount / row['basisWeight']
        return {'foodId': row['id'], 'name': row['name'], 'role': row['role'], 'sourceUrl': SOURCE,
                'retrievedAt': self.metadata['retrievedAt'], 'basisWeight': str(row['basisWeight']),
                'servingWeight': str(amount), 'nutrition': row['nutrition'], 'fingerprint': row['fingerprint'],
                'amountNutrition': {key: format(number(value) * scale, '.4f') if number(value) is not None else ''
                                    for key, value in row['nutrition'].items()}}

    def meal(self, rows, amounts):
        components = [self.component(row, amount) for row, amount in zip(rows, amounts)]
        total = {}
        for field in FIELDS:
            values = [number(c['amountNutrition'][field]) for c in components]
            total[field] = format(sum(values), '.2f') if all(v is not None for v in values) else ''
        fingerprint = digest(components)
        title = ' + '.join(r['name'].replace('_', ' ') for r in rows)
        evidence = {'recipeId': 'meal:' + fingerprint[:24], 'sourceUrl': SOURCE,
                    'retrievedAt': self.metadata['retrievedAt'], 'ingredients': '\n'.join(f"{c['name']} {c['servingWeight']}g" for c in components),
                    'servingWeight': str(sum(amounts)), 'nutrition': total, 'fingerprint': fingerprint,
                    'components': components}
        return {'RCP_SEQ': evidence['recipeId'], 'RCP_NM': title if len(title) <= 60 else title[:57] + '…',
                'RCP_PARTS_DTLS': evidence['ingredients'] + '\n음식 영양DB 기반 조합이며 개별 조리법·재료 목록은 제공되지 않습니다.',
                'INFO_WGT': evidence['servingWeight'], **total, '_evidence': evidence,
                '_componentIds': [r['id'] for r in rows]}

    def retrieve_meals(
            self,
            preferences,
            limit=28,
    ):
        if not self.index.ready:
            raise ValueError(
                "추가 영양정보의 임베딩이 아직 완료되지 않았습니다."
            )

        target = validate_goal(
            preferences.get(
                "nutritionGoal"
            )
        )

        ranked = self.index.rank(
            (
                    "식사 밥 반찬 채소 "
                    + preferences.get(
                "preferences",
                "",
            )
            ),
            limit=len(
                self.rows
            ),
        )

        # =====================================================
        # Candidate groups
        # =====================================================

        groups = {
            role:
                diverse_foods(
                    [
                        self.rows[
                            key
                        ]
                        for key, _
                        in ranked
                        if (
                            self.rows[
                                key
                            ][
                                "role"
                            ]
                            == role

                            and not processed_meat(
                        self.rows[
                            key
                        ]
                    )
                    )
                    ],
                    limit={
                        "staple":
                            12,

                        "protein":
                            24,

                        "vegetable":
                            20,

                    }[
                        role
                    ],
                )

            for role
            in PORTIONS
        }

        if any(
                not rows
                for rows
                in groups.values()
        ):
            return []

        # =====================================================
        # Generate possible meals
        # =====================================================

        options = []

        for combo_index, combo in enumerate(
                product(
                    *groups.values()
                )
        ):
            best = None

            portions = (
                product(
                    *PORTIONS.values()
                )
                if target
                else [
                    (
                        200,
                        100,
                        80,
                    )
                ]
            )

            for amounts in portions:

                kcal = sum(
                    number(
                        row[
                            "nutrition"
                        ][
                            "INFO_ENG"
                        ]
                    )
                    * amount
                    / row[
                        "basisWeight"
                    ]

                    for row, amount
                    in zip(
                        combo,
                        amounts,
                    )
                )

                protein = sum(
                    number(
                        row[
                            "nutrition"
                        ][
                            "INFO_PRO"
                        ]
                    )
                    * amount
                    / row[
                        "basisWeight"
                    ]

                    for row, amount
                    in zip(
                        combo,
                        amounts,
                    )
                )

                # =================================================
                # Sodium
                # =================================================

                sodium = meal_sodium(
                    combo,
                    amounts,
                )

                # 나트륨 정보가 있으면
                # 지나치게 높은 한 끼는 자동 후보에서 제거합니다.
                if (
                        sodium is not None
                        and sodium
                        > MEAL_SODIUM_HARD_MG
                ):
                    continue

                # =================================================
                # Base score
                # =================================================

                if target:
                    score = (
                            abs(
                                kcal
                                - target[
                                    "calories"
                                ]
                                / 3
                            )
                            / (
                                    target[
                                        "calories"
                                    ]
                                    / 3
                            )

                            + abs(
                        protein
                        - target[
                            "protein"
                        ]
                        / 3
                    )
                            / (
                                    target[
                                        "protein"
                                    ]
                                    / 3
                            )
                    )
                else:
                    score = (
                            combo_index
                            * 0.00001
                    )

                # =================================================
                # Macro balance
                # =================================================

                if target:
                    carbs = sum(
                        number(
                            row[
                                "nutrition"
                            ][
                                "INFO_CAR"
                            ]
                        )
                        * amount
                        / row[
                            "basisWeight"
                        ]

                        for row, amount
                        in zip(
                            combo,
                            amounts,
                        )
                    )

                    fat = sum(
                        number(
                            row[
                                "nutrition"
                            ][
                                "INFO_FAT"
                            ]
                        )
                        * amount
                        / row[
                            "basisWeight"
                        ]

                        for row, amount
                        in zip(
                            combo,
                            amounts,
                        )
                    )

                    score += (
                            5
                            * macro_penalty(
                        carbs,
                        protein,
                        fat,
                        target[
                            "protein"
                        ]
                        / 3,
                    )
                    )

                # =================================================
                # Sodium soft penalty
                #
                # 낮으면 penalty 없음.
                # 높아질수록 점수 불리.
                #
                # 따라서 낮은 sodium 조합을 우선 선택합니다.
                # =================================================

                if (
                        sodium is not None
                        and sodium
                        > MEAL_SODIUM_SOFT_MG
                ):
                    sodium_penalty = (
                                             sodium
                                             - MEAL_SODIUM_SOFT_MG
                                     ) / MEAL_SODIUM_SOFT_MG

                    score += (
                            0.75
                            * sodium_penalty
                    )

                if (
                        best is None
                        or score
                        < best[0]
                ):
                    best = (
                        score,
                        combo,
                        amounts,
                    )

            # 모든 portion이 sodium hard limit 등으로
            # 탈락할 수도 있으므로 확인
            if best is not None:
                options.append(
                    best
                )

        if not options:
            return []

        # =====================================================
        # Diversity selection
        # =====================================================

        selected = []

        usage = {}

        family_usage = {}

        while (
                options
                and len(
            selected
        )
                < limit
        ):

            available = [
                item
                for item
                in options

                if all(
                    (
                            usage.get(
                                canonical(
                                    row[
                                        "name"
                                    ]
                                ),
                                0,
                            )
                            < 3

                            and all(
                        family_usage.get(
                            key,
                            0,
                        )
                        < 6

                        for key
                        in families(
                            row[
                                "name"
                            ]
                        )
                    )
                    )

                    for row
                    in item[1]

                    if row[
                        "role"
                    ]
                    == "protein"
                )
            ]

            if not available:
                break

            best = min(
                available,

                key=lambda item:
                (
                        item[0]

                        + 0.2
                        * sum(
                    usage.get(
                        canonical(
                            row[
                                "name"
                            ]
                        ),
                        0,
                    )

                    for row
                    in item[1]
                )

                        + 0.35
                        * sum(
                    family_usage.get(
                        key,
                        0,
                    )

                    for row
                    in item[1]

                    if row[
                        "role"
                    ]
                    == "protein"

                    for key
                    in families(
                        row[
                            "name"
                        ]
                    )
                )
                ),
            )

            options.remove(
                best
            )

            selected.append(
                self.meal(
                    best[1],
                    best[2],
                )
            )

            for row in best[1]:
                usage[
                    canonical(
                        row[
                            "name"
                        ]
                    )
                ] = (
                        usage.get(
                            canonical(
                                row[
                                    "name"
                                ]
                            ),
                            0,
                        )
                        + 1
                )

                if (
                        row[
                            "role"
                        ]
                        == "protein"
                ):
                    for key in families(
                            row[
                                "name"
                            ]
                    ):
                        family_usage[
                            key
                        ] = (
                                family_usage.get(
                                    key,
                                    0,
                                )
                                + 1
                        )

        return selected


if __name__ == '__main__':
    from app import load_env
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('--collect', action='store_true')
    parser.add_argument('--build-index', action='store_true')
    parser.add_argument('--revalidate', action='store_true')
    args = parser.parse_args()
    try:
        if args.collect:
            collect()
        if args.revalidate:
            revalidate()
        catalog = NutrientCatalog()
        print('Eligible prepared foods:', len(catalog.rows))
        print('Roles:', {role: sum(r['role'] == role for r in catalog.rows.values()) for role in PORTIONS})
        if args.build_index:
            print('New embeddings:', catalog.index.build(batch_size=32))
    except Exception as error:
        print('Nutrition import failed:', str(error) if type(error) in (ValueError, RuntimeError) else type(error).__name__)
        raise SystemExit(1)
