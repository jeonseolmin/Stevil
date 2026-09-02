"""Transfer existing embeddings to PostgreSQL and search them with pgvector."""
import hashlib
import json
import os
from hybrid import DIMENSIONS, MODEL, VectorIndex, embed


def snapshot_id(docs):
    return hashlib.sha256(json.dumps(docs, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


class PostgresIndex:
    def __init__(self, docs):
        import psycopg
        self.driver = psycopg
        self.dsn = os.environ['RAG_DATABASE_URL']
        self.snapshot = snapshot_id(docs)
        self.expected = len(VectorIndex(docs).entries)

    @property
    def ready(self):
        try:
            with self.driver.connect(self.dsn, connect_timeout=5) as connection:
                row = connection.execute('SELECT count(*) FROM rag_passages WHERE snapshot = %s', (self.snapshot,)).fetchone()
                return self.expected > 0 and row[0] == self.expected
        except self.driver.Error:
            return False

    def rank(self, question, limit=12):
        query = json.dumps(embed(question, 'RETRIEVAL_QUERY'))
        try:
            with self.driver.connect(self.dsn, connect_timeout=5) as connection:
                connection.execute("SET LOCAL statement_timeout = '5s'")
                rows = connection.execute('''
                    SELECT p.doc_id, max(1 - (v.embedding <=> %s::vector)) AS score
                    FROM rag_passages p JOIN rag_vectors v ON v.key = p.vector_key
                    WHERE p.snapshot = %s AND v.model = %s
                    GROUP BY p.doc_id HAVING max(1 - (v.embedding <=> %s::vector)) >= 0.55
                    ORDER BY score DESC, p.doc_id LIMIT %s
                ''', (query, self.snapshot, MODEL, query, limit)).fetchall()
                return rows
        except self.driver.Error:
            raise OSError('PostgreSQL vector search unavailable') from None


def migrate(docs):
    import psycopg
    from psycopg.types.json import Jsonb
    cache = VectorIndex(docs)
    if not cache.ready:
        raise ValueError('Local embedding cache is incomplete; migration does not generate embeddings')
    snapshot = snapshot_id(docs)
    with psycopg.connect(os.environ['RAG_DATABASE_URL'], connect_timeout=10) as connection:
        connection.execute('CREATE EXTENSION IF NOT EXISTS vector')
        connection.execute('''CREATE TABLE IF NOT EXISTS rag_documents (
            snapshot text NOT NULL, id text NOT NULL, metadata jsonb NOT NULL,
            PRIMARY KEY(snapshot, id))''')
        connection.execute(f'''CREATE TABLE IF NOT EXISTS rag_vectors (
            key text PRIMARY KEY, model text NOT NULL, embedding vector({DIMENSIONS}) NOT NULL)''')
        connection.execute('''CREATE TABLE IF NOT EXISTS rag_passages (
            snapshot text NOT NULL, doc_id text NOT NULL, ordinal integer NOT NULL,
            vector_key text NOT NULL REFERENCES rag_vectors(key), text text NOT NULL,
            PRIMARY KEY(snapshot, doc_id, ordinal),
            FOREIGN KEY(snapshot, doc_id) REFERENCES rag_documents(snapshot, id))''')
        with connection.cursor() as cursor:
            cursor.executemany('INSERT INTO rag_documents VALUES (%s,%s,%s) ON CONFLICT DO NOTHING',
                               [(snapshot, doc['id'], Jsonb(doc)) for doc in docs])
            cursor.executemany('INSERT INTO rag_vectors VALUES (%s,%s,%s::vector) ON CONFLICT DO NOTHING',
                               [(key, MODEL, json.dumps(value)) for key, value in cache.vectors.items()])
            cursor.executemany('INSERT INTO rag_passages VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING',
                               [(snapshot, doc_id, ordinal, key, text) for ordinal, (doc_id, key, text) in enumerate(cache.entries)])
        # One transaction: a failed import leaves no half-imported dataset.
    index = PostgresIndex(docs)
    if not index.ready: raise ValueError('Post-import count verification failed')
    return {'documents': len(docs), 'passages': len(cache.entries), 'vectors': len(cache.vectors), 'snapshot': snapshot}


if __name__ == '__main__':
    from app import Corpus, load_env
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    load_env()
    print(json.dumps(migrate(Corpus(preview=args.preview).docs)))
