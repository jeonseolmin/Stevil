"""
Evidence retrieval for exercise recommendations.

Responsibilities:
- Build a deterministic retrieval query from user-provided context.
- Search the existing exercise VectorIndex.
- Return only documents that actually exist in the exercise evidence corpus.

This module does NOT:
- decide medical safety,
- diagnose conditions,
- prescribe exercise,
- generate recommendations.

The LLM receives only evidence returned by this module.
"""

from exercise_store import (
    documents,
    index,
)




# =========================================================
# Query construction
# =========================================================

def build_exercise_query(p):
    """
    Build a retrieval query from explicit user input.

    We intentionally do not ask the LLM to decide
    what evidence should be retrieved.

    The embedding model handles Korean -> English
    semantic matching.
    """

    parts = []

    # -----------------------------------------------------
    # Base intent
    # -----------------------------------------------------

    parts.append(
        "성인의 신체활동 및 운동 권고"
    )

    # -----------------------------------------------------
    # Experience
    # -----------------------------------------------------

    experience = (
        p.get(
            "experience",
            ""
        )
        or ""
    ).strip()

    if experience:
        parts.append(
            f"운동 경험: {experience}"
        )

    # -----------------------------------------------------
    # Requested intensity
    # -----------------------------------------------------

    intensity = (
        p.get(
            "intensity",
            ""
        )
        or ""
    ).strip()

    if intensity:
        parts.append(
            f"희망 운동 강도: {intensity}"
        )

    # -----------------------------------------------------
    # User limitations
    #
    # These are retrieval context only.
    # They are NOT automatically interpreted
    # as diagnoses or contraindications.
    # -----------------------------------------------------

    limitations = (
        p.get(
            "limitations",
            ""
        )
        or ""
    ).strip()

    if limitations:
        parts.append(
            f"사용자가 입력한 운동 제한: {limitations}"
        )

    # -----------------------------------------------------
    # User preferences may contain goals such as:
    # - 체중 감량
    # - 근육 유지
    # - 심폐체력
    # - 걷기 선호
    #
    # We send the user's own text without inventing a goal.
    # -----------------------------------------------------

    preferences = (
        p.get(
            "preferences",
            ""
        )
        or ""
    ).strip()

    if preferences:
        parts.append(
            f"사용자 선호 또는 목표: {preferences}"
        )

    return "\n".join(
        parts
    )


# =========================================================
# Evidence retrieval
# =========================================================

def retrieve_exercise_evidence(
    p,
    limit=5,
):
    """
    Vector-only evidence retrieval.

    Vector retrieval was selected after evaluation:

    Vector:
    Recall@3 = 0.8571
    Recall@5 = 1.0000
    MRR      = 0.8357

    Hybrid RRF:
    Recall@3 = 0.8214
    Recall@5 = 1.0000
    MRR      = 0.8089

    Therefore BM25/RRF is intentionally not used here.
    """

    docs = documents()

    if not docs:
        raise RuntimeError(
            "운동 근거 문서가 준비되지 않았습니다."
        )

    vector = index()

    if not vector.ready:
        raise RuntimeError(
            "운동 근거 Vector Index가 준비되지 않았습니다. "
            "exercise_store.py --build-index를 먼저 실행해 주세요."
        )

    query = build_exercise_query(
        p
    )

    ranked = vector.rank(
        query,
        limit=limit,
    )

    docs_by_id = {
        doc["id"]: doc
        for doc in docs
    }

    results = []

    for doc_id, similarity in ranked:
        doc = docs_by_id.get(
            doc_id
        )

        if doc is None:
            continue

        results.append(
            {
                "evidenceId":
                    doc_id,

                "title":
                    doc.get(
                        "title",
                        ""
                    ),

                "section":
                    doc.get(
                        "section",
                        ""
                    ),

                "text":
                    doc.get(
                        "text",
                        ""
                    ),

                "sourceId":
                    doc.get(
                        "sourceId"
                    )
                    or doc.get(
                        "source_id"
                    )
                    or doc.get(
                        "id",
                        ""
                    ).split(
                        ":",
                        1,
                    )[0],

                "url":
                    doc.get(
                        "url",
                        ""
                    ),

                "population":
                    doc.get(
                        "applicablePopulation"
                    )
                    or doc.get(
                        "population",
                        ""
                    ),

                "recommendationGrade":
                    doc.get(
                        "recommendationGrade",
                        ""
                    ),

                "recommendationStrength":
                    doc.get(
                        "recommendationStrength",
                        ""
                    ),

                "glp1Specific":
                    bool(
                        doc.get(
                            "glp1Specific",
                            False,
                        )
                    ),

                "reviewStatus":
                    doc.get(
                        "reviewStatus",
                        ""
                    ),

                # similarity is useful for debugging,
                # but it must NOT be shown as
                # "confidence" or medical certainty.
                "retrievalScore":
                    round(
                        float(
                            similarity
                        ),
                        6,
                    ),
            }
        )

    if not results:
        raise RuntimeError(
            "현재 근거 자료에서 관련 운동 근거를 찾지 못했습니다."
        )

    return {
        "query":
            query,

        "items":
            results,
    }


# =========================================================
# Context sent to Gemini
# =========================================================

def evidence_for_model(
    retrieval,
):
    """
    Build a reduced representation for the LLM.

    The server keeps authoritative metadata.
    Gemini receives only what it needs to reason
    from the retrieved passages.
    """

    return [
        {
            "evidenceId":
                item[
                    "evidenceId"
                ],

            "title":
                item[
                    "title"
                ],

            "section":
                item[
                    "section"
                ],

            "text":
                item[
                    "text"
                ],

            "population":
                item[
                    "population"
                ],

            "recommendationGrade":
                item[
                    "recommendationGrade"
                ],

            "glp1Specific":
                item[
                    "glp1Specific"
                ],
        }
        for item
        in retrieval[
            "items"
        ]
    ]


# =========================================================
# Server-side evidence resolution
# =========================================================

def resolve_evidence(
    requested_ids,
    retrieval,
):
    """
    Validate evidence IDs returned by the LLM.

    Gemini cannot introduce an evidence ID that was
    not actually retrieved by the server.
    """

    if not isinstance(
        requested_ids,
        list,
    ):
        raise RuntimeError(
            "AI 운동 근거 형식이 올바르지 않습니다."
        )

    if not requested_ids:
        raise RuntimeError(
            "AI가 운동 추천 근거를 반환하지 않았습니다."
        )

    if len(
        requested_ids
    ) > 5:
        raise RuntimeError(
            "운동 근거 개수가 올바르지 않습니다."
        )

    allowed = {
        item[
            "evidenceId"
        ]:
            item
        for item
        in retrieval[
            "items"
        ]
    }

    resolved = []

    seen = set()

    for evidence_id in requested_ids:
        if not isinstance(
            evidence_id,
            str,
        ):
            raise RuntimeError(
                "AI 운동 근거 ID가 올바르지 않습니다."
            )

        if evidence_id in seen:
            continue

        item = allowed.get(
            evidence_id
        )

        if item is None:
            raise RuntimeError(
                "검색되지 않은 운동 근거를 AI가 반환했습니다."
            )

        seen.add(
            evidence_id
        )

        resolved.append(
            item
        )

    if not resolved:
        raise RuntimeError(
            "검증 가능한 운동 근거가 없습니다."
        )

    return resolved


# =========================================================
# Developer check
# =========================================================

if __name__ == "__main__":
    sample = {
        "experience":
            "운동 초보",

        "intensity":
            "가볍게",

        "limitations":
            "",

        "preferences":
            "체중 감량 중 근육을 유지하고 싶음",
    }

    result = (
        retrieve_exercise_evidence(
            sample
        )
    )

    print(
        "QUERY:"
    )

    print(
        result[
            "query"
        ]
    )

    print()

    for item in result[
        "items"
    ]:
        print(
            item[
                "evidenceId"
            ],
            "|",
            item[
                "retrievalScore"
            ],
            "|",
            item[
                "section"
            ],
        )