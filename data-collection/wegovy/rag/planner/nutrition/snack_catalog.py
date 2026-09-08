"""Collect a small source-backed optional snack catalog; no invented product nutrition."""

import json
import os
import re
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

# data-collection/wegovy/rag/config/snacks.json
SNACKS_PATH = (
    RAG_ROOT
    / "config"
    / "snacks.json"
)

# rag
# → wegovy
# → data-collection
# → repository root
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
# Candidate
# ============================================================

def candidate(row, retrieved):
    title = str(
        row.get(
            "FOOD_NM_KR",
            "",
        )
    )

    basis = grams(
        row.get(
            "SERVING_SIZE"
        )
    )

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
            "INFO_WGT": basis,
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
        "쉐이크" in title
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
        "닭가슴살" in title
        and re.search(
            r"삶은|찐|스팀|수비드|훈제",
            title,
        )
        and not re.search(
            r"샌드|샐러드|볶음밥|김밥|소시지|핫도그|만두",
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
            r"삶은",
            title,
        )
        and not re.search(
            r"흰자|노른자|난황|난백|샐러드|샌드|국수",
            title,
        )
    ):
        kind = "egg"
        amount = 50

    if kind is None:
        return None

    # --------------------------------------------------------
    # Scale nutrition to serving amount
    # --------------------------------------------------------

    scaled = {
        key: (
            format(
                number(value)
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

    if (
        float(
            scaled[
                "INFO_PRO"
            ]
        )
        < 5
    ):
        return None

    # --------------------------------------------------------
    # Evidence
    # --------------------------------------------------------

    component = {
        "foodId": str(
            row[
                "FOOD_CD"
            ]
        ),

        "name": title,

        "role": "snack",

        "sourceUrl": SOURCE,

        "retrievedAt": retrieved,

        "basisWeight": str(
            basis
        ),

        "servingWeight": str(
            amount
        ),

        "nutrition": nutrients,

        "amountNutrition": scaled,

        "fingerprint": digest(
            row
        ),
    }

    evidence = {
        "recipeId":
            "snack:"
            + digest(
                component
            )[:24],

        "sourceUrl":
            SOURCE,

        "retrievedAt":
            retrieved,

        "ingredients":
            f"{title} {amount}g",

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
            (
                "제품 자체 30g 기준이며 "
                "섞는 우유·음료는 포함하지 않습니다."
                if kind == "shake"
                else
                "먹는 부분의 중량 기준입니다. "
                "제품·조리법에 따라 달라질 수 있어요."
            ),

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

    search_terms = [
        "쉐이크",
        "닭가슴살",
        "달걀",
        "삶은계란",
    ]

    for term in search_terms:

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
                    "간식 API 페이지가 비었습니다."
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
                "간식 수집 상한에 도달했습니다."
            )

    publish(
        raw,
        retrieved,
    )


# ============================================================
# Publish
# ============================================================

def publish(
    raw,
    retrieved,
):
    selected = []

    for kind in [
        "shake",
        "chicken",
        "egg",
    ]:

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

        # Prefer generic source entries where possible,
        # then shorter names and lower sodium.
        #
        # This is selection logic only;
        # it is not a brand endorsement.
        choices.sort(
            key=lambda item: (
                "브랜드"
                in item[
                    "title"
                ],

                len(
                    item[
                        "title"
                    ]
                ),

                float(
                    item[
                        "foodEvidence"
                    ][
                        "nutrition"
                    ][
                        "INFO_NA"
                    ]
                    or "inf"
                ),
            )
        )

        seen: set[str] = set()

        for item in choices:
            title = str(
                item.get(
                    "title",
                    "",
                )
            )

            if not title:
                continue

            if title in seen:
                continue

            seen.add(title)

            selected.append(item)

            if len(seen) == 2:
                break

            selected.append(
                item
            )

            if (
                len(
                    seen
                )
                == 2
            ):
                break

        if not seen:
            raise ValueError(
                "영양 기준을 확인한 "
                "간식 후보가 부족합니다: "
                + kind
            )

    # --------------------------------------------------------
    # Save source cache
    # --------------------------------------------------------

    ROOT.mkdir(
        parents=True,
        exist_ok=True,
    )

    (
        ROOT
        / "snack-source.json"
    ).write_text(
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
    # Save Python planner config
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
    # Save backend resource
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
        [
            item[
                "category"
            ]
            for item
            in selected
        ],
    )

    print(
        "Planner snacks:",
        SNACKS_PATH,
    )

    print(
        "Backend snacks:",
        BACKEND_SNACKS_PATH,
    )


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":

    # app.py는 rag 루트에 있으므로,
    # 이 파일을 module 방식으로 실행하는 것을 전제로 합니다.
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
        )

        raise SystemExit(1)