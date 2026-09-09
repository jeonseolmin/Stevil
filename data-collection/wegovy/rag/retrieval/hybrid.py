"""Hybrid retrieval helpers for the Wegovy RAG prototype."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
from pathlib import Path


MFDS_VARIANTS = {
    "mfds-025": "0.25 mg",
    "mfds-05": "0.5 mg",
    "mfds-17": "1.7 mg",
    "mfds-24": "2.4 mg",
}


def _requested_mfds_variant(question: str) -> str | None:
    """
    질문에 특정 위고비 용량이 명시되어 있으면 해당 MFDS source_id를 반환한다.

    예:
        0.25mg -> mfds-025
        0.5mg  -> mfds-05
        1.7mg  -> mfds-17
        2.4mg  -> mfds-24
    """
    q = (question or "").lower().replace(" ", "")

    patterns = {
        "mfds-025": (
            r"0\.25(?:mg|밀리그램)?",
        ),
        "mfds-05": (
            r"0\.5(?:mg|밀리그램)?",
        ),
        "mfds-17": (
            r"1\.7(?:mg|밀리그램)?",
        ),
        "mfds-24": (
            r"2\.4(?:mg|밀리그램)?",
        ),
    }

    for source_id, source_patterns in patterns.items():
        if any(re.search(pattern, q) for pattern in source_patterns):
            return source_id

    return None


def _doc_source_id(doc_id: str, docs: dict) -> str:
    """
    doc_id에 대응하는 source_id를 가져온다.

    문서 구조에 source_id가 있으면 그것을 사용하고,
    없으면 doc_id의 ':' 앞부분을 fallback으로 사용한다.
    """
    doc = docs.get(doc_id, {})
    source_id = doc.get("source_id")

    if source_id:
        return source_id

    return str(doc_id).split(":", 1)[0]


def _choose_representative(
    current_id: str,
    candidate_id: str,
    question: str,
    docs: dict,
) -> str:
    """
    동일 fingerprint 문서가 여러 개 존재할 때 대표 문서를 결정한다.

    특정 용량이 질문에 명시된 경우 해당 MFDS 문서를 우선한다.

    일반 질문에서는 기존 검색 순서를 유지한다.
    표시 제목은 검색 완료 후 별도로 일반 MFDS 제목으로 정규화한다.
    """
    requested = _requested_mfds_variant(question)

    if not requested:
        return current_id

    current_source = _doc_source_id(current_id, docs)
    candidate_source = _doc_source_id(candidate_id, docs)

    if candidate_source == requested:
        return candidate_id

    if current_source == requested:
        return current_id

    return current_id


def _normalize_mfds_result_titles(
    results: list[dict],
    question: str,
) -> list[dict]:
    """
    MFDS 검색 결과의 표시 제목을 정규화한다.

    source_id 자체는 절대로 변경하지 않는다.
    citation/provenance 추적을 유지하기 위함이다.

    일반 질문:
        식품의약품안전처 위고비 국내 허가사항

    특정 용량 질문:
        식품의약품안전처 위고비 1.7 mg 국내 허가사항
    """
    requested = _requested_mfds_variant(question)

    for result in results:
        source_id = result.get("source_id")

        if not source_id:
            result_id = str(result.get("id", ""))
            source_id = result_id.split(":", 1)[0]

        if source_id not in MFDS_VARIANTS:
            continue

        if requested:
            result["title"] = (
                "식품의약품안전처 위고비 "
                f"{MFDS_VARIANTS[requested]} 국내 허가사항"
            )
        else:
            result["title"] = "식품의약품안전처 위고비 국내 허가사항"
            result["variants"] = list(MFDS_VARIANTS.values())

    return results


def _tokenize(text: str) -> list[str]:
    return re.findall(
        r"[0-9A-Za-z가-힣]+",
        (text or "").lower(),
    )


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))

    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))

    if not norm_a or not norm_b:
        return 0.0

    return dot / (norm_a * norm_b)


class VectorIndex:
    def __init__(self, corpus, path: Path | None = None):
        self.corpus = corpus

        if path is None:
            path = Path(
                os.getenv(
                    "RAG_VECTOR_INDEX",
                    Path(__file__).resolve().parents[1]
                    / "cache"
                    / "vector-index.json",
                )
            )

        self.path = Path(path)
        self.entries = []
        self.ready = False

        self._load()

    def _load(self):
        if not self.path.exists():
            return

        try:
            data = json.loads(
                self.path.read_text(encoding="utf-8")
            )

            snapshot = data.get("snapshot")

            if snapshot != self._snapshot():
                return

            self.entries = data.get("entries", [])
            self.ready = bool(self.entries)

        except Exception:
            self.entries = []
            self.ready = False

    def _snapshot(self) -> str:
        payload = []

        for doc in self.corpus.docs:
            payload.append(
                {
                    "id": doc.get("id"),
                    "text": doc.get("text"),
                }
            )

        raw = json.dumps(
            payload,
            ensure_ascii=False,
            sort_keys=True,
        ).encode("utf-8")

        return hashlib.sha256(raw).hexdigest()

    def build(self, batch_size: int = 32) -> int:
        """
        로컬 vector index 생성.

        실제 embedding 생성기는 corpus/embedder 구현에 따라
        주입되어 있다고 가정한다.
        """
        if not hasattr(self.corpus, "embed"):
            return 0

        entries = []

        docs = self.corpus.docs

        for start in range(0, len(docs), batch_size):
            batch = docs[start : start + batch_size]

            texts = [
                doc.get("text", "")
                for doc in batch
            ]

            vectors = self.corpus.embed(texts)

            for doc, vector in zip(batch, vectors):
                entries.append(
                    {
                        "doc_id": doc["id"],
                        "embedding": vector,
                    }
                )

        self.entries = entries
        self.ready = bool(entries)

        self.path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        self.path.write_text(
            json.dumps(
                {
                    "snapshot": self._snapshot(),
                    "entries": entries,
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        return len(entries)

    def search(
        self,
        query: str,
        limit: int = 12,
    ) -> list[tuple[str, float]]:
        if not self.ready:
            return []

        if not hasattr(self.corpus, "embed"):
            return []

        vectors = self.corpus.embed([query])

        if not vectors:
            return []

        query_vector = vectors[0]

        ranked = []

        for entry in self.entries:
            similarity = _cosine_similarity(
                query_vector,
                entry["embedding"],
            )

            ranked.append(
                (
                    entry["doc_id"],
                    similarity,
                )
            )

        scores = {}

        for doc_id, similarity in ranked:
            scores[doc_id] = max(
                scores.get(doc_id, -1),
                similarity,
            )

        return sorted(
            (
                (doc_id, score)
                for doc_id, score in scores.items()
                if score >= 0.55
            ),
            key=lambda item: item[1],
            reverse=True,
        )[:limit]


class HybridSearch:
    def __init__(self, corpus, index):
        self.corpus = corpus
        self.index = index

    def search(
        self,
        query: str,
        limit: int = 6,
    ):
        docs = {
            doc["id"]: doc
            for doc in self.corpus.docs
        }

        eligible = self.corpus.eligible_ids(query)

        #
        # BM25 / lexical retrieval
        #
        lexical_results = self.corpus.search(
            query,
            limit=max(limit * 3, 12),
        )

        lexical = []

        for result in lexical_results:
            doc_id = result.get("id")

            if doc_id and doc_id in eligible:
                lexical.append(doc_id)

        #
        # Semantic / vector retrieval
        #
        fallback = None

        if self.index.ready:
            semantic = self.index.search(
                query,
                limit=max(limit * 3, 12),
            )

            semantic = [
                (doc_id, score)
                for doc_id, score in semantic
                if doc_id in eligible
            ]

        else:
            semantic = []
            fallback = "vector_index_not_ready"

        #
        # Reciprocal Rank Fusion
        #
        scores = {}

        rankings = [
            lexical,
            [doc_id for doc_id, _ in semantic],
        ]

        for ranking in rankings:
            for rank, doc_id in enumerate(
                ranking,
                start=1,
            ):
                if doc_id not in docs:
                    continue

                doc = docs[doc_id]

                #
                # 동일 본문을 하나의 evidence로 취급한다.
                #
                fingerprint = re.sub(
                    r"\s+",
                    "",
                    doc.get("text", ""),
                )

                representative, score = scores.get(
                    fingerprint,
                    (doc_id, 0),
                )

                #
                # 기존에는 첫 번째 doc_id가 무조건 대표가 되었기
                # 때문에 mfds-025가 반복적으로 대표 출처가 됐다.
                #
                # 특정 용량 질문에서는 해당 용량의 MFDS 문서를
                # 대표로 교체한다.
                #
                representative = _choose_representative(
                    representative,
                    doc_id,
                    query,
                    docs,
                )

                scores[fingerprint] = (
                    representative,
                    score + 1 / (60 + rank),
                )

        ranked_scores = sorted(
            scores.values(),
            key=lambda item: item[1],
            reverse=True,
        )[:limit]

        results = [
            dict(
                docs[doc_id],
                score=round(score, 6),
            )
            for doc_id, score in ranked_scores
        ]

        #
        # MFDS 표시 제목 정규화.
        #
        # 중요:
        # source_id/id는 변경하지 않는다.
        #
        results = _normalize_mfds_result_titles(
            results,
            query,
        )

        return results, "hybrid", fallback