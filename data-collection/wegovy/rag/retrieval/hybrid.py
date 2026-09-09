"""Gemini embeddings + exact cosine retrieval + reciprocal rank fusion."""
import hashlib
from contextlib import closing
import json
import math
import os
import re
from pathlib import Path
import sqlite3
from urllib.error import HTTPError
from urllib.request import Request, urlopen

MODEL = 'gemini-embedding-001'
DIMENSIONS = 768


# MFDS 위고비 함량별 source.
# 실제 source_id/id는 citation 추적을 위해 변경하지 않는다.
MFDS_VARIANTS = {
    'mfds-025': '0.25 mg',
    'mfds-05': '0.5 mg',
    'mfds-17': '1.7 mg',
    'mfds-24': '2.4 mg',
}


def requested_mfds_variant(question):
    """질문에 특정 위고비 함량이 있으면 대응하는 MFDS source_id를 반환한다."""
    q = (question or '').lower().replace(' ', '')

    patterns = {
        'mfds-025': r'0\.25(?:mg|밀리그램)?',
        'mfds-05': r'0\.5(?:mg|밀리그램)?',
        'mfds-17': r'1\.7(?:mg|밀리그램)?',
        'mfds-24': r'2\.4(?:mg|밀리그램)?',
    }

    for source_id, pattern in patterns.items():
        if re.search(pattern, q):
            return source_id

    return None


def doc_source_id(doc_id, docs):
    """doc_id에서 실제 source_id를 얻는다."""
    doc = docs.get(doc_id, {})

    if doc.get('source_id'):
        return doc['source_id']

    return str(doc_id).split(':', 1)[0]


def choose_representative(current_id, candidate_id, question, docs):
    """
    같은 본문의 여러 MFDS 문서 중 대표 문서를 결정한다.

    특정 함량 질문:
        해당 함량 source를 우선.

    일반 질문:
        기존 검색 순서를 그대로 유지.
    """
    requested = requested_mfds_variant(question)

    if not requested:
        return current_id

    current_source = doc_source_id(current_id, docs)
    candidate_source = doc_source_id(candidate_id, docs)

    if candidate_source == requested:
        return candidate_id

    if current_source == requested:
        return current_id

    return current_id


def normalize_mfds_titles(results, question):
    """
    사용자에게 노출되는 MFDS title만 정규화한다.

    source_id/id/section/text는 변경하지 않는다.
    """
    requested = requested_mfds_variant(question)

    for result in results:
        source_id = result.get('source_id')

        if not source_id:
            source_id = str(result.get('id', '')).split(':', 1)[0]

        if source_id not in MFDS_VARIANTS:
            continue

        if requested:
            result['title'] = (
                '식품의약품안전처 위고비 '
                f'{MFDS_VARIANTS[requested]} 국내 허가사항'
            )
        else:
            result['title'] = '식품의약품안전처 위고비 국내 허가사항'
            result['variants'] = list(MFDS_VARIANTS.values())

    return results


def normalize(values):
    if len(values) != DIMENSIONS or any(
        not isinstance(v, (float, int)) or not math.isfinite(v)
        for v in values
    ):
        raise ValueError('Invalid embedding')

    norm = math.sqrt(sum(v*v for v in values))

    if norm == 0:
        raise ValueError('Zero embedding')

    return [v / norm for v in values]


def embed(text, task):
    key = os.environ.get('GEMINI_API_KEY')

    if not key:
        raise ValueError('GEMINI_API_KEY missing')

    payload = {
        'model': 'models/' + MODEL,
        'content': {
            'parts': [
                {
                    'text': text
                }
            ]
        },
        'taskType': task,
        'outputDimensionality': DIMENSIONS
    }

    request = Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:embedContent',
        data=json.dumps(payload).encode(),
        headers={
            'Content-Type': 'application/json',
            'x-goog-api-key': key
        }
    )

    try:
        with urlopen(
            request,
            timeout=8 if task == 'RETRIEVAL_QUERY' else 30
        ) as response:
            return normalize(
                json.load(response)['embedding']['values']
            )

    except HTTPError as error:
        # Do not expose provider error bodies or credentials.
        raise ValueError(
            f'Embedding API HTTP {error.code}'
        ) from None


def embed_batch(texts):
    key = os.environ.get('GEMINI_API_KEY')

    if not key:
        raise ValueError('GEMINI_API_KEY missing')

    payload = {
        'requests': [
            {
                'model': 'models/' + MODEL,
                'content': {
                    'parts': [
                        {
                            'text': text
                        }
                    ]
                },
                'taskType': 'RETRIEVAL_DOCUMENT',
                'outputDimensionality': DIMENSIONS
            }
            for text in texts
        ]
    }

    request = Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:batchEmbedContents',
        data=json.dumps(payload).encode(),
        headers={
            'Content-Type': 'application/json',
            'x-goog-api-key': key
        }
    )

    try:
        with urlopen(request, timeout=45) as response:
            vectors = [
                normalize(item['values'])
                for item in json.load(response)['embeddings']
            ]

        if len(vectors) != len(texts):
            raise ValueError('Embedding count mismatch')

        return vectors

    except HTTPError as error:
        raise ValueError(
            f'Embedding API HTTP {error.code}'
        ) from None


def passages(doc):
    # Short overlapping search windows stay below model input limits.
    # Answers retain the full original parent section,
    # including tables and exceptions.
    text = doc['section'] + '\n' + doc['text']

    if doc.get('page'):
        text = re.sub(r'[ \t]+', ' ', text)

    for start in range(0, len(text), 500):
        yield text[start:start+650]

        if start + 650 >= len(text):
            break


def cache_key(text):
    return hashlib.sha256(
        f'{MODEL}:{DIMENSIONS}:RETRIEVAL_DOCUMENT:v1:{text}'.encode()
    ).hexdigest()


class VectorIndex:
    def __init__(self, docs, path=None):
        rag_root = Path(__file__).resolve().parents[1]

        self.path = (
            path
            or rag_root
            / "cache"
            / "embeddings.sqlite3"
        )

        self.entries = [
            (doc['id'], cache_key(text), text)
            for doc in docs
            for text in passages(doc)
        ]

        self.vectors = {}

        if self.path.exists():
            try:
                needed = {
                    entry[1]
                    for entry in self.entries
                }

                with closing(
                    sqlite3.connect(self.path)
                ) as connection:
                    for key, encoded in connection.execute(
                        'SELECT key, vector FROM embeddings'
                    ):
                        if key in needed:
                            self.vectors[key] = normalize(
                                json.loads(encoded)
                            )

            except (
                sqlite3.Error,
                ValueError,
                TypeError
            ):
                self.vectors = {}

    @property
    def ready(self):
        return (
            bool(self.entries)
            and all(
                key in self.vectors
                for _, key, _ in self.entries
            )
        )

    def build(self, batch_size=1):
        self.path.parent.mkdir(
            parents=True,
            exist_ok=True
        )

        count = 0

        with closing(
            sqlite3.connect(self.path)
        ) as connection:

            connection.execute(
                'CREATE TABLE IF NOT EXISTS embeddings '
                '(key TEXT PRIMARY KEY, vector TEXT NOT NULL)'
            )

            pending = list({
                key: text
                for _, key, text in self.entries
                if key not in self.vectors
            }.items())

            for start in range(
                0,
                len(pending),
                batch_size
            ):
                batch = pending[
                    start:start+batch_size
                ]

                vectors = (
                    embed_batch([
                        text
                        for _, text in batch
                    ])
                    if batch_size > 1
                    else [
                        embed(
                            batch[0][1],
                            'RETRIEVAL_DOCUMENT'
                        )
                    ]
                )

                for (key, _), vector in zip(
                    batch,
                    vectors
                ):
                    connection.execute(
                        'INSERT OR REPLACE INTO embeddings VALUES (?, ?)',
                        (
                            key,
                            json.dumps(vector)
                        )
                    )

                    self.vectors[key] = vector
                    count += 1

                # Interrupted builds resume without repeating paid requests.
                connection.commit()

                print(
                    f'Embedded {count}/{len(pending)} new passages',
                    flush=True
                )

        return count

    def rank(self, question, limit=12):
        query = embed(
            question,
            'RETRIEVAL_QUERY'
        )

        scores = {}

        for doc_id, key, _ in self.entries:
            similarity = sum(
                a*b
                for a, b in zip(
                    query,
                    self.vectors[key]
                )
            )

            scores[doc_id] = max(
                scores.get(doc_id, -1),
                similarity
            )

        # This is a retrieval cutoff,
        # not a calibrated correctness probability.
        return sorted(
            (
                (doc_id, score)
                for doc_id, score in scores.items()
                if score >= .55
            ),
            key=lambda item: item[1],
            reverse=True
        )[:limit]


class HybridSearch:
    def __init__(self, corpus, index):
        self.corpus, self.index = corpus, index

    def search(self, question, limit=3):
        lexical = self.corpus.search(
            question,
            limit=12
        )

        if not self.index.ready:
            return (
                lexical[:limit],
                'bm25',
                'vector_index_not_ready'
            )

        try:
            semantic = self.index.rank(
                question,
                limit=len(self.corpus.docs)
            )

        except (
            OSError,
            ValueError,
            KeyError,
            TypeError
        ):
            return (
                lexical[:limit],
                'bm25',
                'query_embedding_failed'
            )

        docs = {
            doc['id']: doc
            for doc in self.corpus.docs
        }

        eligible = (
            self.corpus.eligible_ids(question)
            if hasattr(self.corpus, 'eligible_ids')
            else set(docs)
        )

        semantic = [
            (doc_id, score)
            for doc_id, score in semantic
            if doc_id in eligible
        ]

        scores = {}

        # Deduplicate equivalent parent sections before assigning each rank.
        for ranking in (
            [doc['id'] for doc in lexical],
            [doc_id for doc_id, _ in semantic]
        ):
            seen = set()
            rank = 0

            for doc_id in ranking:
                fingerprint = ''.join(
                    docs[doc_id]['text'].split()
                )

                if fingerprint in seen:
                    continue

                seen.add(fingerprint)
                rank += 1

                representative, score = scores.get(
                    fingerprint,
                    (doc_id, 0)
                )

                # 특정 함량 질문이라면 같은 본문을 가진 MFDS 문서 중
                # 해당 함량의 source를 대표 evidence로 사용한다.
                representative = choose_representative(
                    representative,
                    doc_id,
                    question,
                    docs
                )

                scores[fingerprint] = (
                    representative,
                    score + 1 / (60 + rank)
                )

                if rank == 12:
                    break

        results = [
            dict(
                docs[doc_id],
                score=round(score, 6)
            )
            for doc_id, score in
            sorted(
                scores.values(),
                key=lambda item: item[1],
                reverse=True
            )[:limit]
        ]

        # 표시 제목만 정규화한다.
        # 실제 evidence의 source_id/id/text는 그대로 보존한다.
        results = normalize_mfds_titles(
            results,
            question
        )

        return results, 'hybrid', None