import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

from exercise_store import PageText
from hybrid import DIMENSIONS, VectorIndex


class ExerciseStoreTests(unittest.TestCase):
    def test_table_cells_remain_separate_and_scripts_are_excluded(self):
        parser = PageText()
        parser.feed('<table><tr><td>Walking</td><td>3.0</td></tr></table><script>secret</script>')
        self.assertIn('Walking | 3.0', parser.text())
        self.assertNotIn('secret', parser.text())

    def test_unchanged_documents_make_no_second_embedding_request(self):
        docs = [{'id': 'walk', 'section': 'Walking', 'text': 'Slow walking'}]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'vectors.sqlite3'
            with patch('hybrid.embed_batch', return_value=[[1.0] + [0.0] * (DIMENSIONS-1)]) as paid:
                self.assertEqual(VectorIndex(docs, path).build(batch_size=32), 1)
                self.assertEqual(VectorIndex(docs, path).build(batch_size=32), 0)
                self.assertEqual(paid.call_count, 1)


if __name__ == '__main__':
    unittest.main()
