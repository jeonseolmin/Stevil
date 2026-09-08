import unittest
from app import Corpus
from prepare_extra import RegionParser
from hybrid import HybridSearch


class ExtraTests(unittest.TestCase):
    def test_region_excludes_navigation_and_retains_table(self):
        parser = RegionParser(lambda tag, attrs: attrs.get('id') == 'body')
        parser.feed('<nav>noise</nav><section id="body"><h2>Results</h2><p>Complete text</p><table><tr><td>A</td><td>10</td></tr></table></section><footer>noise</footer>')
        self.assertEqual(len(parser.regions), 1)
        self.assertIn('A | 10', parser.regions[0])
        self.assertNotIn('noise', parser.regions[0])

    def test_country_routing(self):
        corpus = Corpus(preview=True)
        domestic = corpus.eligible_ids('투여를 잊은 경우')
        self.assertTrue(domestic)
        self.assertTrue(all(doc['jurisdiction'] == 'KR' for doc in corpus.docs if doc['id'] in domestic))
        us = corpus.eligible_ids('미국 허가사항')
        self.assertTrue(us)
        self.assertTrue(all(doc['jurisdiction'] == 'US' for doc in corpus.docs if doc['id'] in us))
        self.assertTrue(any(doc['source_id'] == 'select' and doc['id'] in corpus.eligible_ids('SELECT 연구') for doc in corpus.docs))
        self.assertTrue(any(doc['source_id'] == 'ema-naion' and doc['id'] in corpus.eligible_ids('NAION 시력') for doc in corpus.docs))

    def test_pdf_provenance_and_pending(self):
        corpus = Corpus(preview=True)
        foreign = [doc for doc in corpus.docs if doc['source_id'] in ('us-pi', 'eu-pi')]
        self.assertTrue(foreign)
        for doc in foreign:
            self.assertTrue(doc['url'].endswith('#page=' + str(doc['page'])))
            self.assertEqual(doc['review_status'], 'pending_review')
            self.assertFalse(doc['formulation_verified'])
        self.assertEqual(Corpus().docs, [])

    def test_vector_scope_filter(self):
        corpus = Corpus(preview=True)
        foreign = next(doc['id'] for doc in corpus.docs if doc['jurisdiction'] == 'US')
        class Index:
            ready = True
            def rank(self, question, limit=12): return [(foreign, 1.0)]
        hits, mode, _ = HybridSearch(corpus, Index()).search('투여를 잊은 경우')
        self.assertEqual(mode, 'hybrid')
        self.assertTrue(all(doc['jurisdiction'] == 'KR' for doc in hits))

if __name__ == '__main__': unittest.main()
