"""
Exercise evidence retrieval evaluation.

This script evaluates exercise evidence retrieval only.
It does NOT validate clinical correctness or generate recommendations.

Compared retrieval methods:
- BM25
- Gemini embedding cosine retrieval
- Hybrid retrieval using Reciprocal Rank Fusion (RRF)

Metrics:
- Recall@3
- Recall@5
- MRR
"""

import json
import math
import re
from collections import Counter
from pathlib import Path

from app import load_env
from exercise_store import documents, index


BASE = Path(__file__).parent


# =========================================================
# Evaluation cases
#
# expected_source_prefixes:
# A result is considered relevant if its document id starts
# with any of the expected prefixes.
#
# IMPORTANT:
# Keep this benchmark fixed while comparing retrieval methods.
# =========================================================

CASES = [

    # -----------------------------------------------------
    # WHO - Adults 18–64
    # -----------------------------------------------------

    {
        "id": "adult-activity-guideline",
        "question":
            "성인에게 권장되는 신체활동량은 어느 정도인가요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s2",
        ],
        "note":
            "WHO adults 18–64 physical activity recommendation",
    },

    {
        "id": "adult-weekly-activity",
        "question":
            "일주일에 운동을 얼마나 해야 건강에 도움이 되나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s2",
        ],
        "note":
            "Natural-language weekly activity recommendation",
    },

    {
        "id": "adult-moderate-vigorous",
        "question":
            "성인은 중강도 운동과 고강도 운동을 어느 정도 해야 하나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s2",
        ],
        "note":
            "WHO moderate/vigorous physical activity",
    },

    {
        "id": "adult-sitting-less",
        "question":
            "하루 종일 앉아서 생활하는 사람은 활동량을 어떻게 늘리는 게 좋나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s2",
        ],
        "note":
            "Sedentary adult activity guidance",
    },

    # -----------------------------------------------------
    # WHO - Older adults
    # -----------------------------------------------------

    {
        "id": "older-adult-activity",
        "question":
            "65세 이상 고령자는 어떤 신체활동을 얼마나 해야 하나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s3",
        ],
        "note":
            "WHO older adults recommendation",
    },

    {
        "id": "older-adult-balance",
        "question":
            "나이가 많은 사람의 낙상 예방이나 균형 능력에 도움이 되는 운동 근거가 있나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s3",
        ],
        "note":
            "Older adult balance and fall prevention",
    },

    # -----------------------------------------------------
    # WHO - Pregnancy / postpartum
    # -----------------------------------------------------

    {
        "id": "pregnancy-activity",
        "question":
            "임신 중에도 운동을 해도 되나요? 권장되는 활동량이 궁금해요.",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s4",
        ],
        "note":
            "WHO pregnancy physical activity",
    },

    {
        "id": "postpartum-activity",
        "question":
            "출산 후에는 신체활동을 어떻게 다시 시작하는 게 권장되나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s4",
        ],
        "note":
            "WHO postpartum activity recommendation",
    },

    # -----------------------------------------------------
    # WHO - Chronic conditions
    # -----------------------------------------------------

    {
        "id": "chronic-condition-activity",
        "question":
            "만성질환이 있는 성인도 일반적으로 신체활동을 하는 것이 권장되나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s6",
        ],
        "note":
            "WHO adults with specified chronic conditions",
    },

    {
        "id": "hypertension-diabetes-activity",
        "question":
            "고혈압이나 제2형 당뇨가 있는 사람에게 운동 권고가 있나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s6",
        ],
        "note":
            "WHO chronic condition subgroup retrieval",
    },

    # -----------------------------------------------------
    # WHO - Disability
    # -----------------------------------------------------

    {
        "id": "disability-activity",
        "question":
            "장애가 있는 사람도 신체활동 권고가 따로 있나요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s7",
        ],
        "note":
            "WHO people living with disability",
    },

    # -----------------------------------------------------
    # EASO - strict recommendation-level Gold Labels
    # -----------------------------------------------------

    {
        "id": "obesity-aerobic",
        "question":
            "비만 성인에게 유산소 운동은 어떤 도움이 있나요?",
        "expected_source_prefixes": [
            "easo-fulltext:table3-r01",
        ],
        "note":
            "EASO aerobic exercise for weight/fat loss",
    },

    {
        "id": "obesity-resistance",
        "question":
            "비만 성인에게 근력 운동이나 저항 운동이 필요한 이유는 무엇인가요?",
        "expected_source_prefixes": [
            "easo-fulltext:table3-r05",
            "easo-fulltext:table3-r11",
        ],
        "note":
            "EASO resistance training for lean mass and muscular fitness",
    },

    {
        "id": "obesity-weight-loss-exercise",
        "question":
            "체중이 많이 나가는 사람이 살을 빼기 위해 운동한다면 어떤 방식이 근거가 있나요?",
        "expected_source_prefixes": [
            "easo-fulltext:table3-r01",
        ],
        "note":
            "EASO aerobic exercise for weight and fat loss",
    },

    {
        "id": "obesity-muscle-preservation",
        "question":
            "다이어트하면서 근육이 줄지 않게 하려면 어떤 운동을 같이 해야 하나요?",
        "expected_source_prefixes": [
            "easo-fulltext:table3-r05",
        ],
        "note":
            "EASO resistance training for lean body mass preservation",
    },

    {
        "id": "obesity-cardio-fitness",
        "question":
            "비만인 사람이 심폐체력을 높이려면 어떤 운동 근거를 참고해야 하나요?",
        "expected_source_prefixes": [
            "easo-fulltext:table3-r10",
        ],
        "note":
            "EASO exercise for cardiorespiratory fitness",
    },

    {
        "id": "obesity-health-without-weight-loss",
        "question":
            "체중이 크게 안 빠지더라도 운동 자체로 건강상 이득을 얻을 수 있나요?",
        "expected_source_prefixes": [
            "easo-fulltext:obr13273-sec-1049",
        ],
        "note":
            "EASO clinical implications beyond weight loss",
    },

    # -----------------------------------------------------
    # Compendium - Walking
    # -----------------------------------------------------

    {
        "id": "walking-met",
        "question":
            "걷기 운동의 강도나 MET 정보를 알고 싶어요.",
        "expected_source_prefixes": [
            "compendium-walking",
        ],
        "note":
            "2024 Compendium walking activity",
    },

    {
        "id": "brisk-walking",
        "question":
            "빠르게 걷는 운동은 어느 정도 강도의 활동인가요?",
        "expected_source_prefixes": [
            "compendium-walking",
        ],
        "note":
            "Brisk walking activity classification",
    },

    {
        "id": "easy-beginner-cardio",
        "question":
            "헬스장을 안 가도 할 수 있는 쉬운 유산소 활동의 강도를 찾아보고 싶어요.",
        "expected_source_prefixes": [
            "compendium-walking",
            "compendium-bicycling",
        ],
        "note":
            "Ambiguous beginner cardio activity retrieval",
    },

    # -----------------------------------------------------
    # Compendium - Bicycling
    # -----------------------------------------------------

    {
        "id": "cycling-met",
        "question":
            "자전거 운동의 MET와 운동 강도를 알고 싶어요.",
        "expected_source_prefixes": [
            "compendium-bicycling",
        ],
        "note":
            "2024 Compendium bicycling activity",
    },

    {
        "id": "stationary-bike",
        "question":
            "실내 자전거처럼 페달을 밟는 운동은 활동 강도가 어느 정도인가요?",
        "expected_source_prefixes": [
            "compendium-bicycling",
        ],
        "note":
            "Cycling semantic paraphrase retrieval",
    },

    # -----------------------------------------------------
    # Compendium - Water
    # -----------------------------------------------------

    {
        "id": "water-activity",
        "question":
            "수중 운동이나 수영 활동의 운동 강도 정보를 알고 싶어요.",
        "expected_source_prefixes": [
            "compendium-water",
        ],
        "note":
            "Compendium water activity",
    },

    {
        "id": "low-impact-water",
        "question":
            "물속에서 할 수 있는 운동 종류와 활동 강도를 찾아보고 싶어요.",
        "expected_source_prefixes": [
            "compendium-water",
        ],
        "note":
            "Water exercise semantic retrieval",
    },

    # -----------------------------------------------------
    # Compendium - Conditioning
    # -----------------------------------------------------

    {
        "id": "conditioning",
        "question":
            "컨디셔닝 운동이나 근력 운동 종류별 활동 강도를 알고 싶어요.",
        "expected_source_prefixes": [
            "compendium-conditioning",
        ],
        "note":
            "Compendium conditioning activity",
    },

    {
        "id": "strength-activity-met",
        "question":
            "웨이트 트레이닝이나 저항 운동의 활동 강도 자료를 찾고 싶어요.",
        "expected_source_prefixes": [
            "compendium-conditioning",
        ],
        "note":
            "Resistance exercise activity classification",
    },

    # -----------------------------------------------------
    # Cross-source / ambiguous
    # -----------------------------------------------------

    {
        "id": "beginner-walking",
        "question":
            "운동을 거의 해본 적이 없는 사람이 시작할 만한 활동 근거를 찾고 싶어요.",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s2",
            "easo-fulltext:",
            "compendium-walking",
        ],
        "note":
            "Broad beginner activity retrieval",
    },

    {
        "id": "overweight-start-exercise",
        "question":
            "체중이 많이 나가고 운동 경험이 적은 성인은 어떤 식으로 활동을 시작하면 좋을까요?",
        "expected_source_prefixes": [
            "who-recommendations:ch4.s2",
            "easo-fulltext:",
        ],
        "note":
            "Cross-source obesity and general adult guidance",
    },
]


# =========================================================
# Tokenizer
# =========================================================

def tokens(text):
    words = re.findall(
        r"[가-힣]+|[a-z]+|\d+(?:\.\d+)?",
        text.lower(),
    )

    result = []

    for word in words:
        if re.fullmatch(r"[가-힣]+", word):
            result.append(word)

            result.extend(
                word[i:i + 2]
                for i in range(
                    len(word) - 1
                )
            )
        else:
            result.append(word)

    return result


# =========================================================
# BM25
# =========================================================

class ExerciseBM25:
    def __init__(self, docs):
        self.docs = docs

        self.counts = [
            Counter(
                tokens(
                    doc.get(
                        "section",
                        "",
                    )
                    + "\n"
                    + doc.get(
                        "text",
                        "",
                    )
                )
            )
            for doc in docs
        ]

        self.df = Counter(
            token
            for counts in self.counts
            for token in counts
        )

        self.avg_length = (
            sum(
                sum(
                    counts.values()
                )
                for counts in self.counts
            )
            / max(
                len(self.docs),
                1,
            )
        )

    def search(
        self,
        question,
        limit=12,
    ):
        query = set(
            tokens(question)
        )

        ranked = []

        for doc, counts in zip(
            self.docs,
            self.counts,
        ):
            length = sum(
                counts.values()
            )

            score = 0.0

            for token in (
                query
                & counts.keys()
            ):
                frequency = (
                    counts[token]
                )

                idf = math.log(
                    1
                    + (
                        len(self.docs)
                        - self.df[token]
                        + 0.5
                    )
                    / (
                        self.df[token]
                        + 0.5
                    )
                )

                score += (
                    idf
                    * frequency
                    * 2.2
                    / (
                        frequency
                        + 1.2
                        * (
                            0.25
                            + 0.75
                            * length
                            / self.avg_length
                        )
                    )
                )

            if score > 0:
                ranked.append(
                    (
                        score,
                        doc["id"],
                    )
                )

        ranked.sort(
            key=lambda item:
                item[0],
            reverse=True,
        )

        return ranked[:limit]


# =========================================================
# Reciprocal Rank Fusion
# =========================================================

def rrf_merge(
    bm25_ids,
    vector_ids,
    limit=5,
    k=60,
):
    """
    Reciprocal Rank Fusion.

    score(d) =
        1 / (k + BM25_rank)
        +
        1 / (k + Vector_rank)

    Raw BM25 score and cosine similarity are intentionally
    not directly compared because they live on different
    score scales.
    """

    scores = {}

    for rank, doc_id in enumerate(
        bm25_ids,
        start=1,
    ):
        scores[doc_id] = (
            scores.get(
                doc_id,
                0.0,
            )
            + 1
            / (
                k
                + rank
            )
        )

    for rank, doc_id in enumerate(
        vector_ids,
        start=1,
    ):
        scores[doc_id] = (
            scores.get(
                doc_id,
                0.0,
            )
            + 1
            / (
                k
                + rank
            )
        )

    ranked = sorted(
        scores.items(),
        key=lambda item:
            item[1],
        reverse=True,
    )

    return [
        doc_id
        for doc_id, _
        in ranked[:limit]
    ]


# =========================================================
# Metrics
# =========================================================

def is_relevant(
    doc_id,
    expected_prefixes,
):
    return any(
        doc_id.startswith(
            prefix
        )
        for prefix
        in expected_prefixes
    )


def recall_at_k(
    ranked_ids,
    expected_prefixes,
    k,
):
    return int(
        any(
            is_relevant(
                doc_id,
                expected_prefixes,
            )
            for doc_id
            in ranked_ids[:k]
        )
    )


def reciprocal_rank(
    ranked_ids,
    expected_prefixes,
):
    for rank, doc_id in enumerate(
        ranked_ids,
        start=1,
    ):
        if is_relevant(
            doc_id,
            expected_prefixes,
        ):
            return (
                1
                / rank
            )

    return 0.0


# =========================================================
# Summary helper
# =========================================================

def summarize(
    rows,
    method,
):
    count = len(rows)

    return {
        "recall_at_3":
            round(
                sum(
                    row[method][
                        "recall_at_3"
                    ]
                    for row in rows
                )
                / count,
                4,
            ),

        "recall_at_5":
            round(
                sum(
                    row[method][
                        "recall_at_5"
                    ]
                    for row in rows
                )
                / count,
                4,
            ),

        "mrr":
            round(
                sum(
                    row[method][
                        "reciprocal_rank"
                    ]
                    for row in rows
                )
                / count,
                4,
            ),
    }


# =========================================================
# Evaluation
# =========================================================

def evaluate():
    load_env()

    docs = documents()

    if not docs:
        raise SystemExit(
            "Exercise documents not found. "
            "Run exercise collection/import first."
        )

    bm25 = ExerciseBM25(
        docs
    )

    vector = index()

    if not vector.ready:
        raise SystemExit(
            "Exercise vector index is not ready. "
            "Run: python exercise_store.py --build-index"
        )

    rows = []

    for case in CASES:
        question = (
            case["question"]
        )

        expected = (
            case[
                "expected_source_prefixes"
            ]
        )

        # ---------------------------------------------
        # BM25
        # ---------------------------------------------

        bm25_results = (
            bm25.search(
                question,
                limit=12,
            )
        )

        bm25_ids = [
            doc_id
            for _, doc_id
            in bm25_results
        ]

        # ---------------------------------------------
        # Vector
        # ---------------------------------------------

        vector_results = (
            vector.rank(
                question,
                limit=12,
            )
        )

        vector_ids = [
            doc_id
            for doc_id, _
            in vector_results
        ]

        # ---------------------------------------------
        # Hybrid - RRF
        # ---------------------------------------------

        hybrid_ids = (
            rrf_merge(
                bm25_ids,
                vector_ids,
                limit=5,
            )
        )

        # ---------------------------------------------
        # Result row
        # ---------------------------------------------

        row = {
            "id":
                case["id"],

            "question":
                question,

            "expected_source_prefixes":
                expected,

            "note":
                case["note"],

            "bm25": {
                "result_ids":
                    bm25_ids[:5],

                "recall_at_3":
                    recall_at_k(
                        bm25_ids,
                        expected,
                        3,
                    ),

                "recall_at_5":
                    recall_at_k(
                        bm25_ids,
                        expected,
                        5,
                    ),

                "reciprocal_rank":
                    round(
                        reciprocal_rank(
                            bm25_ids,
                            expected,
                        ),
                        4,
                    ),
            },

            "vector": {
                "result_ids":
                    vector_ids[:5],

                "recall_at_3":
                    recall_at_k(
                        vector_ids,
                        expected,
                        3,
                    ),

                "recall_at_5":
                    recall_at_k(
                        vector_ids,
                        expected,
                        5,
                    ),

                "reciprocal_rank":
                    round(
                        reciprocal_rank(
                            vector_ids,
                            expected,
                        ),
                        4,
                    ),
            },

            "hybrid": {
                "result_ids":
                    hybrid_ids,

                "recall_at_3":
                    recall_at_k(
                        hybrid_ids,
                        expected,
                        3,
                    ),

                "recall_at_5":
                    recall_at_k(
                        hybrid_ids,
                        expected,
                        5,
                    ),

                "reciprocal_rank":
                    round(
                        reciprocal_rank(
                            hybrid_ids,
                            expected,
                        ),
                        4,
                    ),
            },
        }

        rows.append(row)

    # ---------------------------------------------
    # Summary
    # ---------------------------------------------

    summary = {
        "cases":
            len(rows),

        "bm25":
            summarize(
                rows,
                "bm25",
            ),

        "vector":
            summarize(
                rows,
                "vector",
            ),

        "hybrid":
            summarize(
                rows,
                "hybrid",
            ),
    }

    report = {
        "note": (
            "Exercise evidence retrieval "
            "evaluation only. "
            "This does not validate clinical "
            "correctness or recommendation safety."
        ),

        "rrf": {
            "k": 60,
            "description":
                "BM25 + vector ranking fused "
                "with Reciprocal Rank Fusion",
        },

        "summary":
            summary,

        "cases":
            rows,
    }

    # ---------------------------------------------
    # Save report
    # ---------------------------------------------

    target = (
        BASE
        / "cache"
        / "exercise"
        / "retrieval-evaluation.json"
    )

    target.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    target.write_text(
        json.dumps(
            report,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    # ---------------------------------------------
    # Console output
    # ---------------------------------------------

    print()
    print(
        "Exercise retrieval evaluation"
    )
    print(
        "-----------------------------"
    )

    print(
        f"Cases: {len(rows)}"
    )

    print()

    for method, title in [
        ("bm25", "BM25"),
        ("vector", "Vector"),
        ("hybrid", "Hybrid (RRF)"),
    ]:
        print(title)

        print(
            "Recall@3:",
            summary[method][
                "recall_at_3"
            ],
        )

        print(
            "Recall@5:",
            summary[method][
                "recall_at_5"
            ],
        )

        print(
            "MRR:",
            summary[method][
                "mrr"
            ],
        )

        print()

    print(
        "Report:",
        target,
    )


if __name__ == "__main__":
    evaluate()