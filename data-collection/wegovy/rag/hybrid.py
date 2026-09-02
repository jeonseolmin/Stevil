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


def normalize(values):
    if len(values) != DIMENSIONS or any(not isinstance(v, (float, int)) or not math.isfinite(v) for v in values):
        raise ValueError('Invalid embedding')
    norm = math.sqrt(sum(v*v for v in values))
    if norm == 0:
        raise ValueError('Zero embedding')
    return [v / norm for v in values]


def embed(text, task):
    key = os.environ.get('GEMINI_API_KEY')
    if not key:
        raise ValueError('GEMINI_API_KEY missing')
    payload = {'model': 'models/' + MODEL, 'content': {'parts': [{'text': text}]},
               'taskType': task, 'outputDimensionality': DIMENSIONS}
    request = Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:embedContent',
                      data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    try:
        with urlopen(request, timeout=8 if task == 'RETRIEVAL_QUERY' else 30) as response:
            return normalize(json.load(response)['embedding']['values'])
    except HTTPError as error:
        # Do not expose provider error bodies or credentials.
        raise ValueError(f'Embedding API HTTP {error.code}') from None


def embed_batch(texts):
    key = os.environ.get('GEMINI_API_KEY')
    if not key: raise ValueError('GEMINI_API_KEY missing')
    payload = {'requests': [{'model': 'models/' + MODEL, 'content': {'parts': [{'text': text}]},
                            'taskType': 'RETRIEVAL_DOCUMENT', 'outputDimensionality': DIMENSIONS} for text in texts]}
    request = Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:batchEmbedContents',
                      data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    try:
        with urlopen(request, timeout=45) as response:
            vectors = [normalize(item['values']) for item in json.load(response)['embeddings']]
        if len(vectors) != len(texts): raise ValueError('Embedding count mismatch')
        return vectors
    except HTTPError as error:
        raise ValueError(f'Embedding API HTTP {error.code}') from None


def passages(doc):
    # Short overlapping search windows stay below model input limits. Answers
    # retain the full original parent section, including tables and exceptions.
    text = doc['section'] + '\n' + doc['text']
    if doc.get('page'):
        text = re.sub(r'[ \t]+', ' ', text)
    for start in range(0, len(text), 500):
        yield text[start:start+650]
        if start + 650 >= len(text):
            break


def cache_key(text):
    return hashlib.sha256(f'{MODEL}:{DIMENSIONS}:RETRIEVAL_DOCUMENT:v1:{text}'.encode()).hexdigest()


class VectorIndex:
    def __init__(self, docs, path=None):
        self.path = path or Path(__file__).with_name('cache') / 'embeddings.sqlite3'
        self.entries = [(doc['id'], cache_key(text), text) for doc in docs for text in passages(doc)]
        self.vectors = {}
        if self.path.exists():
            try:
                needed = {entry[1] for entry in self.entries}
                with closing(sqlite3.connect(self.path)) as connection:
                    for key, encoded in connection.execute('SELECT key, vector FROM embeddings'):
                        if key in needed:
                            self.vectors[key] = normalize(json.loads(encoded))
            except (sqlite3.Error, ValueError, TypeError):
                self.vectors = {}

    @property
    def ready(self):
        return bool(self.entries) and all(key in self.vectors for _, key, _ in self.entries)

    def build(self, batch_size=1):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        with closing(sqlite3.connect(self.path)) as connection:
            connection.execute('CREATE TABLE IF NOT EXISTS embeddings (key TEXT PRIMARY KEY, vector TEXT NOT NULL)')
            pending = list({key: text for _, key, text in self.entries if key not in self.vectors}.items())
            for start in range(0, len(pending), batch_size):
                batch = pending[start:start+batch_size]
                vectors = embed_batch([text for _, text in batch]) if batch_size > 1 else [embed(batch[0][1], 'RETRIEVAL_DOCUMENT')]
                for (key, _), vector in zip(batch, vectors):
                    connection.execute('INSERT OR REPLACE INTO embeddings VALUES (?, ?)', (key, json.dumps(vector)))
                    self.vectors[key] = vector
                    count += 1
                connection.commit()  # Interrupted builds resume without repeating paid requests.
                print(f'Embedded {count}/{len(pending)} new passages', flush=True)
        return count

    def rank(self, question, limit=12):
        query = embed(question, 'RETRIEVAL_QUERY')
        scores = {}
        for doc_id, key, _ in self.entries:
            similarity = sum(a*b for a, b in zip(query, self.vectors[key]))
            scores[doc_id] = max(scores.get(doc_id, -1), similarity)
        # This is a retrieval cutoff, not a calibrated correctness probability.
        return sorted(((doc_id, score) for doc_id, score in scores.items() if score >= .55),
                      key=lambda item: item[1], reverse=True)[:limit]


class HybridSearch:
    def __init__(self, corpus, index):
        self.corpus, self.index = corpus, index

    def search(self, question, limit=3):
        lexical = self.corpus.search(question, limit=12)
        if not self.index.ready:
            return lexical[:limit], 'bm25', 'vector_index_not_ready'
        try:
            semantic = self.index.rank(question, limit=len(self.corpus.docs))
        except (OSError, ValueError, KeyError, TypeError):
            return lexical[:limit], 'bm25', 'query_embedding_failed'
        docs = {doc['id']: doc for doc in self.corpus.docs}
        eligible = self.corpus.eligible_ids(question) if hasattr(self.corpus, 'eligible_ids') else set(docs)
        semantic = [(doc_id, score) for doc_id, score in semantic if doc_id in eligible]
        scores = {}
        # Deduplicate equivalent parent sections before assigning each rank.
        for ranking in ([doc['id'] for doc in lexical], [doc_id for doc_id, _ in semantic]):
            seen = set()
            rank = 0
            for doc_id in ranking:
                fingerprint = ''.join(docs[doc_id]['text'].split())
                if fingerprint in seen:
                    continue
                seen.add(fingerprint)
                rank += 1
                representative, score = scores.get(fingerprint, (doc_id, 0))
                scores[fingerprint] = (representative, score + 1 / (60 + rank))
                if rank == 12:
                    break
        results = [dict(docs[doc_id], score=round(score, 6)) for doc_id, score in
                   sorted(scores.values(), key=lambda item: item[1], reverse=True)[:limit]]
        return results, 'hybrid', None
