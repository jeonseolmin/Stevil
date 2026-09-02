import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app import Corpus, LabelParser, ROOT, answer


class RagTests(unittest.TestCase):
    def test_pending_excluded_by_default(self):
        self.assertEqual(Corpus().docs, [])

    def test_real_corpus(self):
        corpus = Corpus(preview=True)
        self.assertTrue({'mfds-025', 'mfds-05', 'mfds-17'} <= {doc['source_id'] for doc in corpus.docs})
        for question, expected in [('임신', '임신'), ('급성 췌장염', '췌장염'), ('투여를 잊은 경우', '잊은')]:
            hits = corpus.search(question)
            self.assertTrue(hits)
            self.assertTrue(any(expected in doc['text'] for doc in hits))
        self.assertEqual(corpus.search('xyznonexistent'), [])

    def test_table_preserved_and_scripts_outside_sections_excluded(self):
        parser = LabelParser()
        parser.feed('<script>BAD</script><div id="_ud_doc"><p>용량</p><table><tr><td>1주</td><td>0.25 mg</td></tr></table></div>footer')
        self.assertEqual(parser.sections['_ud_doc'], '용량\n1주 | 0.25 mg')

    def test_tampered_file_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'raw').mkdir()
            (root / 'runs').mkdir()
            source = json.loads((ROOT / 'sources.json').read_text(encoding='utf-8'))[0]
            (root / 'sources.json').write_text(json.dumps([source]), encoding='utf-8')
            (root / 'raw' / 'bad.html').write_text('tampered')
            result = {'source_id': source['id'], 'status': 'downloaded_pending_review', 'relative_path': 'raw/bad.html', 'sha256': 'bad'}
            (root / 'runs' / 'run.json').write_text(json.dumps({'results': [result]}))
            corpus = Corpus(root, preview=True)
            self.assertEqual(corpus.docs, [])
            self.assertIn('SHA-256', corpus.status[0]['reason'])

    def test_generation_fallback_without_key(self):
        with patch.dict('os.environ', {}, clear=True):
            response = answer(Corpus(preview=True), '임신', 'test-model')
        self.assertEqual(response['mode'], 'evidence')
        self.assertIn('notice', response)

    def test_gemini_citations_validated(self):
        from io import BytesIO
        for output, expected in [('검토 전 초안입니다. 설명 [1]', 'generated_draft'), ('설명 [99]', 'evidence')]:
            body = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': output}]}}]}
            with patch.dict('os.environ', {'GEMINI_API_KEY': 'test-only'}), patch('app.urlopen', return_value=BytesIO(json.dumps(body).encode())):
                response = answer(Corpus(preview=True), '임신', 'test-model')
            self.assertEqual(response['mode'], expected)


if __name__ == '__main__':
    unittest.main()
