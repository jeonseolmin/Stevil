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

from planner.exercise.store import (
    documents,
    index,
)




# =========================================================
# Query construction
# =========================================================

def build_exercise_query(p):
  """
  Build an evidence-oriented retrieval query.

  Exercise experience / requested intensity are handled
  by the candidate filter, not evidence retrieval.

  Retrieval focuses on the user's explicitly stated
  exercise goal or concern.
  """

  preferences = (
          p.get(
            "preferences",
            ""
          )
          or ""
  ).strip()

  limitations = (
          p.get(
            "limitations",
            ""
          )
          or ""
  ).strip()

  parts = []

  # -----------------------------------------------------
  # Explicit user goal
  # -----------------------------------------------------

  if preferences:
    parts.append(
      preferences
    )

  # -----------------------------------------------------
  # Deterministic semantic query expansion
  #
  # These expansions improve Korean -> English
  # guideline retrieval.
  #
  # They do NOT select a specific document ID.
  # -----------------------------------------------------

  text = preferences.lower()

  if any(
          keyword in text
          for keyword in (
              "근육 유지",
              "근육을 유지",
              "근육 보존",
              "근육을 보존",
              "근손실",
              "근 손실",
              "제지방",
          )
  ):
    parts.append(
      "체중 감량 중 제지방량과 근육량 보존"
    )

    parts.append(
      "preservation of lean body mass during weight loss "
      "resistance training"
    )

  if any(
          keyword in text
          for keyword in (
              "체중 감량",
              "살 빼",
              "다이어트",
              "지방 감량",
          )
  ):
    parts.append(
      "overweight obesity exercise weight loss fat loss"
    )

  if any(
          keyword in text
          for keyword in (
              "심폐",
              "체력",
              "지구력",
          )
  ):
    parts.append(
      "cardiorespiratory fitness exercise "
      "adults with overweight or obesity"
    )

  if any(
          keyword in text
          for keyword in (
              "근력",
              "힘",
              "근육 강화",
          )
  ):
    parts.append(
      "muscular fitness resistance training"
    )

  # -----------------------------------------------------
  # Limitation text is retained only as user context.
  #
  # We do not translate a symptom into a diagnosis or
  # contraindication.
  # -----------------------------------------------------

  if limitations:
    parts.append(
      f"사용자가 직접 입력한 운동 제한: {limitations}"
    )

  # -----------------------------------------------------
  # Generic fallback only when no meaningful goal exists.
  # -----------------------------------------------------

  if not parts:
    parts.append(
      "성인의 신체활동 및 운동 권고"
    )

  return "\n".join(parts)

# =========================================================
# Lightweight metadata reranking
# =========================================================

RECOMMENDATION_MARGIN = 0.03


def is_recommendation(doc):
    """
    True when the document is an extracted,
    graded recommendation such as EASO Table 3.
    """

    return bool(
        doc.get("recommendationGrade")
        or doc.get("recommendationStrength")
    )


def rerank_evidence(
    ranked,
    docs_by_id,
):
    """
    Preserve semantic retrieval as the primary signal.

    Only candidates within a small similarity margin
    from the top semantic result are reranked.

    Among near-tied candidates:
    1. graded recommendation documents first
    2. higher vector similarity second

    Semantically distant recommendation documents
    are NOT promoted.
    """

    if not ranked:
        return []

    top_score = ranked[0][1]

    near = []
    far = []

    for doc_id, similarity in ranked:
        doc = docs_by_id.get(
            doc_id
        )

        if doc is None:
            continue

        item = (
            doc_id,
            similarity,
        )

        if (
            similarity
            >= top_score
            - RECOMMENDATION_MARGIN
        ):
            near.append(
                item
            )
        else:
            far.append(
                item
            )

    near.sort(
        key=lambda item: (
            1
            if is_recommendation(
                docs_by_id[
                    item[0]
                ]
            )
            else 0,

            item[1],
        ),
        reverse=True,
    )

    # far는 기존 vector 순위를 그대로 유지합니다.
    return near + far

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

    docs_by_id = {
      doc["id"]: doc
      for doc in docs
    }

    raw_ranked = vector.rank(
      query,
      limit=max(
        12,
        limit,
      ),
    )

    ranked = rerank_evidence(
      raw_ranked,
      docs_by_id,
    )[:limit]


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

            "recommendation":
              is_recommendation(
                doc
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
    from app import load_env

    load_env()

    sample = {
        "experience": "운동 초보",
        "intensity": "가볍게",
        "limitations": "",
        "preferences": "체중 감량 중 근육을 유지하고 싶음",
    }

    result = retrieve_exercise_evidence(
        sample
    )

    print("QUERY:")
    print(result["query"])
    print()

    for item in result["items"]:
        print(
            item["evidenceId"],
            "|",
            item["retrievalScore"],
            "|",
            item["section"],
        )