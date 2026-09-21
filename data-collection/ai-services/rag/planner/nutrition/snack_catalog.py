"""Collect source-backed snack candidates from the public nutrition DB."""

import json
import os
import re
import sqlite3

from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, unquote
from urllib.request import urlopen

from planner.food.nutrient_catalog import (
    ENDPOINT,
    SOURCE,
    FIELDS,
    ROOT,
    grams,
    nutrient_text,
    digest,
    parse_page,
)

from planner.nutrition.matching import (
    number,
    recipe_nutrition,
)


# ============================================================
# Paths
# ============================================================

# snack_catalog.py
# → planner/nutrition/
# → planner/
# → rag/
RAG_ROOT = Path(__file__).resolve().parents[2]

SNACKS_PATH = (
    RAG_ROOT
    / "config"
    / "snacks.json"
)

REPOSITORY_ROOT = (
    RAG_ROOT
    .parents[2]
)

BACKEND_SNACKS_PATH = (
    REPOSITORY_ROOT
    / "stevil-backend"
    / "src"
    / "main"
    / "resources"
    / "planner"
    / "snacks.json"
)


# ============================================================
# Snack categories
# ============================================================

SNACK_CATEGORIES = [
    "shake",
    "chicken",
    "egg",
    "greek_yogurt",
    "soy_milk",
    "milk",
    "banana",
    "apple",
    "sweet_potato",
    "cheese",
]


PROTEIN_REQUIRED_KINDS = {
    "shake",
    "chicken",
    "egg",
    "greek_yogurt",
    "soy_milk",
    "milk",
    "cheese",
}


SEARCH_TERMS = [
    "쉐이크",
    "프로틴",
    "단백질",
    "닭가슴살",
    "달걀",
    "계란",
    "그릭요거트",
    "그릭요구르트",
    "두유",
    "저지방우유",
    "무지방우유",
    "바나나",
    "사과",
    "고구마",
    "치즈",
]


# ============================================================
# Helpers
# ============================================================

def safe_float(value):
    try:
        return float(
            number(value)
            or 0
        )
    except (
        TypeError,
        ValueError,
    ):
        return 0.0


def scaled_nutrients(
    nutrients,
    amount,
    basis,
):
    return {
        key: (
            format(
                safe_float(value)
                * amount
                / basis,
                ".4f",
            )
            if value
            else ""
        )
        for key, value
        in nutrients.items()
    }


# ============================================================
# Candidate
# ============================================================

def candidate(
    row,
    retrieved,
):
    title = str(
        row.get(
            "FOOD_NM_KR",
            "",
        )
    ).strip()

    if not title:
        return None

    basis = grams(
        row.get(
            "SERVING_SIZE"
        )
    )

    if (
        not basis
        or basis <= 0
    ):
        return None

    nutrients = {
        key: nutrient_text(
            row.get(
                field,
                "",
            )
        )
        for key, field
        in FIELDS.items()
    }

    nutrition = recipe_nutrition(
        {
            "INFO_WGT":
                basis,

            **nutrients,
        }
    )

    if (
        not nutrition
        or not row.get(
            "FOOD_CD"
        )
    ):
        return None

    kind = None
    amount = 0

    # --------------------------------------------------------
    # Protein shake
    # --------------------------------------------------------

    if (
        re.search(
            r"쉐이크|프로틴",
            title,
        )
        and re.search(
            r"단백|프로틴",
            title,
        )
        and (
            nutrition[
                "protein"
            ]
            * 100
            / basis
            >= 35
        )
    ):
        kind = "shake"
        amount = 30

    # --------------------------------------------------------
    # Chicken breast
    # --------------------------------------------------------

    elif (
        "닭가슴살"
        in title
        and re.search(
            r"삶은|찐|스팀|수비드|훈제",
            title,
        )
        and not re.search(
            (
                r"샌드|샐러드|볶음밥|김밥|"
                r"소시지|핫도그|만두"
            ),
            title,
        )
    ):
        kind = "chicken"
        amount = 50

    # --------------------------------------------------------
    # Boiled egg
    # --------------------------------------------------------

    elif (
        re.search(
            r"달걀|계란",
            title,
        )
        and re.search(
            r"삶은|구운",
            title,
        )
        and not re.search(
            (
                r"흰자|노른자|난황|난백|"
                r"샐러드|샌드|국수"
            ),
            title,
        )
    ):
        kind = "egg"
        amount = 50

    # --------------------------------------------------------
    # Greek yogurt
    # --------------------------------------------------------

    elif (
        re.search(
            (
                r"그릭.*요거트|"
                r"그릭.*요구르트|"
                r"greek.*yog"
            ),
            title,
            re.I,
        )
        and (
            nutrition[
                "protein"
            ]
            * 100
            / basis
            >= 5
        )
        and not re.search(
            r"아이스크림|케이크|빵",
            title,
        )
    ):
        kind = "greek_yogurt"
        amount = 100

    # --------------------------------------------------------
    # Soy milk
    # --------------------------------------------------------

    elif (
        "두유"
        in title
        and not re.search(
            (
                r"초코|딸기|바나나맛|"
                r"커피|카라멜"
            ),
            title,
        )
    ):
        kind = "soy_milk"
        amount = min(
            190,
            basis,
        )

    # --------------------------------------------------------
    # Low-fat / skim milk
    # --------------------------------------------------------

    elif (
        "우유"
        in title
        and re.search(
            r"저지방|무지방",
            title,
        )
        and not re.search(
            r"초코|딸기|커피",
            title,
        )
    ):
        kind = "milk"
        amount = min(
            200,
            basis,
        )

    # --------------------------------------------------------
    # Banana
    # --------------------------------------------------------

    elif (
        "바나나"
        in title
        and not re.search(
            (
                r"우유|쉐이크|칩|빵|"
                r"케이크|요거트|요구르트|"
                r"주스|스무디"
            ),
            title,
        )
    ):
        kind = "banana"
        amount = min(
            100,
            basis,
        )

    # --------------------------------------------------------
    # Apple
    # --------------------------------------------------------

    elif (
        "사과"
        in title
        and not re.search(
            (
                r"주스|즙|잼|파이|빵|"
                r"케이크|샐러드|음료"
            ),
            title,
        )
    ):
        kind = "apple"
        amount = min(
            150,
            basis,
        )

    # --------------------------------------------------------
    # Sweet potato
    # --------------------------------------------------------

    elif (
        "고구마"
        in title
        and (
            re.search(
                r"삶은|찐|구운|군고구마",
                title,
            )
            or title
            in {
                "고구마",
                "고구마_찐것",
                "고구마_구운것",
            }
        )
        and not re.search(
            (
                r"맛탕|빵|케이크|튀김|"
                r"칩|샐러드"
            ),
            title,
        )
    ):
        kind = "sweet_potato"
        amount = min(
            100,
            basis,
        )

    # --------------------------------------------------------
    # Cheese
    # --------------------------------------------------------

    elif (
        "치즈"
        in title
        and not re.search(
            (
                r"케이크|피자|핫도그|"
                r"샌드위치|햄버거|소스"
            ),
            title,
        )
        and (
            nutrition[
                "protein"
            ]
            * 100
            / basis
            >= 10
        )
    ):
        kind = "cheese"
        amount = min(
            30,
            basis,
        )

    if kind is None:
        return None

    # --------------------------------------------------------
    # Scale nutrition
    # --------------------------------------------------------

    scaled = scaled_nutrients(
        nutrients,
        amount,
        basis,
    )

    calories = safe_float(
        scaled.get(
            "INFO_ENG"
        )
    )

    protein = safe_float(
        scaled.get(
            "INFO_PRO"
        )
    )

    fat = safe_float(
        scaled.get(
            "INFO_FAT"
        )
    )

    sodium = safe_float(
        scaled.get(
            "INFO_NA"
        )
    )

    # --------------------------------------------------------
    # Basic snack guardrails
    # --------------------------------------------------------

    if (
        calories <= 0
        or calories > 350
    ):
        return None

    if (
        kind
        in PROTEIN_REQUIRED_KINDS
        and protein < 5
    ):
        return None

    # 너무 고나트륨인 간식은 제외
    if sodium > 800:
        return None

    # 치즈처럼 지방이 높을 수 있는 후보는
    # 간식 한 번 기준 과도한 지방만 제외
    if fat > 25:
        return None

    # --------------------------------------------------------
    # Evidence
    # --------------------------------------------------------

    component = {
        "foodId":
            str(
                row[
                    "FOOD_CD"
                ]
            ),

        "name":
            title,

        "role":
            "snack",

        "sourceUrl":
            SOURCE,

        "retrievedAt":
            retrieved,

        "basisWeight":
            str(
                basis
            ),

        "servingWeight":
            str(
                amount
            ),

        "nutrition":
            nutrients,

        "amountNutrition":
            scaled,

        "fingerprint":
            digest(
                row
            ),
    }

    evidence = {
        "recipeId":
            (
                "snack:"
                + digest(
                    component
                )[:24]
            ),

        "sourceUrl":
            SOURCE,

        "retrievedAt":
            retrieved,

        "ingredients":
            (
                f"{title} "
                f"{amount:g}g"
            ),

        "servingWeight":
            str(
                amount
            ),

        "nutrition":
            scaled,

        "fingerprint":
            digest(
                component
            ),

        "components": [
            component
        ],
    }

    if kind == "shake":
        note = (
            "제품 자체 30g 기준이며 "
            "섞는 우유·음료는 포함하지 않습니다."
        )

    elif kind in {
        "banana",
        "apple",
        "sweet_potato",
    }:
        note = (
            "먹는 부분의 중량 기준입니다. "
            "크기와 조리 상태에 따라 실제 영양량은 달라질 수 있어요."
        )

    else:
        note = (
            "먹는 부분의 중량 기준입니다. "
            "제품·조리법에 따라 실제 영양량은 달라질 수 있어요."
        )

    return {
        "id":
            evidence[
                "recipeId"
            ],

        "category":
            kind,

        "title":
            title[:60],

        "note":
            note,

        "foodEvidence":
            evidence,
    }


# ============================================================
# Collect
# ============================================================

def collect():
    key = os.environ.get(
        "FOOD_NUTRITION_API_KEY",
        "",
    )

    if not key:
        raise ValueError(
            "FOOD_NUTRITION_API_KEY가 필요합니다."
        )

    retrieved = (
        datetime.now(
            timezone.utc
        )
        .isoformat()
    )

    raw = {}

    for term in SEARCH_TERMS:

        for page in range(
            1,
            31,
        ):
            query = urlencode(
                {
                    "serviceKey":
                        unquote(
                            key
                        ),

                    "pageNo":
                        page,

                    "numOfRows":
                        500,

                    "type":
                        "json",

                    "FOOD_NM_KR":
                        term,
                }
            )

            with urlopen(
                ENDPOINT
                + "?"
                + query,
                timeout=45,
            ) as response:

                rows, total = (
                    parse_page(
                        json.load(
                            response
                        )
                    )
                )

            if (
                not rows
                and total
            ):
                raise ValueError(
                    (
                        "간식 API 페이지가 "
                        f"비었습니다: {term}"
                    )
                )

            raw.update(
                {
                    str(
                        row[
                            "FOOD_CD"
                        ]
                    ):
                        row

                    for row
                    in rows

                    if row.get(
                        "FOOD_CD"
                    )
                }
            )

            if (
                page
                * 500
                >= total
            ):
                break

        else:
            raise ValueError(
                (
                    "간식 수집 상한에 "
                    f"도달했습니다: {term}"
                )
            )

    publish(
        raw,
        retrieved,
    )


# ============================================================
# Selection
# ============================================================

def item_sort_key(
    item,
):
    evidence = (
        item
        .get(
            "foodEvidence",
            {}
        )
    )

    nutrition = (
        evidence
        .get(
            "nutrition",
            {}
        )
    )

    sodium = safe_float(
        nutrition.get(
            "INFO_NA"
        )
    )

    title = str(
        item.get(
            "title",
            "",
        )
    )

    return (
        "브랜드"
        in title,

        len(
            title
        ),

        sodium,
    )


def select_candidates(
    raw,
    retrieved,
):
    selected = []

    per_category_limit = {
        "shake": 6,
        "chicken": 6,
        "egg": 6,
        "greek_yogurt": 8,
        "soy_milk": 8,
        "milk": 6,
        "banana": 6,
        "apple": 6,
        "sweet_potato": 8,
        "cheese": 6,
    }

    for kind in SNACK_CATEGORIES:

        choices = [
            item

            for row
            in raw.values()

            if (
                item := candidate(
                    row,
                    retrieved,
                )
            )

            and (
                item[
                    "category"
                ]
                == kind
            )
        ]

        choices.sort(
            key=item_sort_key
        )

        seen_titles = set()

        limit = (
            per_category_limit[
                kind
            ]
        )

        for item in choices:

            title = str(
                item.get(
                    "title",
                    "",
                )
            ).strip()

            if not title:
                continue

            normalized_title = (
                re.sub(
                    r"\s+",
                    "",
                    title,
                )
                .lower()
            )

            if (
                normalized_title
                in seen_titles
            ):
                continue

            seen_titles.add(
                normalized_title
            )

            selected.append(
                item
            )

            if (
                len(
                    seen_titles
                )
                >= limit
            ):
                break

        print(
            "Snack category:",
            kind,
            "candidates=",
            len(
                choices
            ),
            "selected=",
            len(
                seen_titles
            ),
        )

    if not selected:
        raise ValueError(
            "영양 기준을 충족하는 간식 후보가 없습니다."
        )

    return selected


# ============================================================
# DB
# ============================================================

def save_snacks_to_db(
    selected,
):
    ROOT.mkdir(
        parents=True,
        exist_ok=True,
    )

    db_path = (
        ROOT
        / "foods.sqlite3"
    )

    if not db_path.exists():
        raise ValueError(
            (
                "foods.sqlite3가 없습니다. "
                "먼저 nutrient_catalog를 수집해 주세요."
            )
        )

    with sqlite3.connect(
        db_path
    ) as db:

        db.execute(
            """
            CREATE TABLE IF NOT EXISTS snacks (
                id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 100,
                enabled INTEGER NOT NULL DEFAULT 1,
                payload TEXT NOT NULL
            )
            """
        )

        with db:

            db.execute(
                """
                DELETE FROM snacks
                """
            )

            db.executemany(
                """
                INSERT INTO snacks (
                    id,
                    category,
                    title,
                    priority,
                    enabled,
                    payload
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        item[
                            "id"
                        ],

                        item[
                            "category"
                        ],

                        item[
                            "title"
                        ],

                        index,

                        1,

                        json.dumps(
                            item,
                            ensure_ascii=False,
                        ),
                    )

                    for index, item
                    in enumerate(
                        selected
                    )
                ],
            )

    print(
        "Snack DB:",
        db_path,
    )

    print(
        "Saved DB snacks:",
        len(
            selected
        ),
    )


# ============================================================
# Publish
# ============================================================

def publish(
    raw,
    retrieved,
):
    selected = select_candidates(
        raw,
        retrieved,
    )

    # --------------------------------------------------------
    # Save source cache
    # --------------------------------------------------------

    ROOT.mkdir(
        parents=True,
        exist_ok=True,
    )

    source_path = (
        ROOT
        / "snack-source.json"
    )

    source_path.write_text(
        json.dumps(
            {
                "retrievedAt":
                    retrieved,

                "rows":
                    list(
                        raw.values()
                    ),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Save foods.sqlite3 snacks table
    # --------------------------------------------------------

    save_snacks_to_db(
        selected
    )

    # --------------------------------------------------------
    # Save Python planner JSON fallback
    # --------------------------------------------------------

    SNACKS_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    SNACKS_PATH.write_text(
        json.dumps(
            selected,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Save backend JSON fallback
    # --------------------------------------------------------

    BACKEND_SNACKS_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    BACKEND_SNACKS_PATH.write_text(
        json.dumps(
            selected,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "Collected snack candidates:",
        len(
            selected
        ),
    )

    counts = {}

    for item in selected:
        category = item[
            "category"
        ]

        counts[
            category
        ] = (
            counts.get(
                category,
                0,
            )
            + 1
        )

    print(
        "Snack categories:",
        counts,
    )

    print(
        "Planner fallback:",
        SNACKS_PATH,
    )

    print(
        "Backend fallback:",
        BACKEND_SNACKS_PATH,
    )


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":

    from app import load_env

    load_env()

    try:
        import sys

        if (
            "--refresh"
            in sys.argv
        ):
            source_path = (
                ROOT
                / "snack-source.json"
            )

            if not source_path.exists():
                raise ValueError(
                    (
                        "snack-source.json이 없습니다. "
                        "먼저 간식 데이터를 수집해 주세요."
                    )
                )

            data = json.loads(
                source_path.read_text(
                    encoding="utf-8"
                )
            )

            publish(
                {
                    str(
                        row[
                            "FOOD_CD"
                        ]
                    ):
                        row

                    for row
                    in data[
                        "rows"
                    ]
                },

                data[
                    "retrievedAt"
                ],
            )

        else:
            collect()

    except Exception as error:

        print(
            "Snack collection failed:",
            type(
                error
            ).__name__,
            str(
                error
            ),
        )

        raise SystemExit(1)