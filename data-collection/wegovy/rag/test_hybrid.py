import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from hybrid import DIMENSIONS, HybridSearch, VectorIndex, cache_key, normalize


def vector(axis=0):
    return [1.0 if i == axis else 0.0 for i in range(DIMENSIONS)]


class HybridTests(unittest.TestCase):
    def test_vector_validation(self):
        for invalid in ([0] * DIMENSIONS, [float('nan')] * DIMENSIONS, [1, 2]):
            with self.assertRaises(ValueError):
                normalize(invalid)

    def test_cache_reuse_and_content_change(self):
        docs = [{'id': 'a', 'section': 'section', 'text': 'original'}]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'vectors.sqlite3'
            with patch('hybrid.embed', return_value=vector()) as api:
                index = VectorIndex(docs, path)
                self.assertEqual(index.build(), 1)
                self.assertEqual(VectorIndex(docs, path).build(), 0)
                api.assert_called_once()
                changed = VectorIndex([dict(docs[0], text='changed')], path)
                self.assertFalse(changed.ready)
                self.assertEqual(changed.build(), 1)
            # Removed/unapproved documents do not reappear from a populated cache.
            self.assertFalse(VectorIndex([], path).ready)

    def test_cosine_ranking(self):
        docs = [{'id': 'a', 'section': 'a', 'text': 'one'}, {'id': 'b', 'section': 'b', 'text': 'two'}]
        with tempfile.TemporaryDirectory() as directory:
            index = VectorIndex(docs, Path(directory) / 'vectors.sqlite3')
            index.vectors = {entry[1]: vector(i) for i, entry in enumerate(index.entries)}
            with patch('hybrid.embed', return_value=vector(1)):
                self.assertEqual(index.rank('paraphrase'), [('b', 1.0)])

    def test_fusion_and_failure_fallback(self):
        class Corpus:
            docs = [{'id': 'a', 'text': 'lexical'}, {'id': 'b', 'text': 'semantic'}]
            def search(self, question, limit=3):
                return self.docs[:1]
        class Index:
            ready = True
            def rank(self, question, limit=12):
                return [('b', .9), ('a', .6)]
        search = HybridSearch(Corpus(), Index())
        docs, mode, reason = search.search('question')
        self.assertEqual(mode, 'hybrid')
        self.assertEqual([doc['id'] for doc in docs], ['a', 'b'])
        with patch.object(search.index, 'rank', side_effect=OSError()):
            docs, mode, reason = search.search('question')
            self.assertEqual(mode, 'bm25')
            self.assertEqual(reason, 'query_embedding_failed')
            self.assertEqual([doc['id'] for doc in docs], ['a'])


if __name__ == '__main__':
    unittest.main()
