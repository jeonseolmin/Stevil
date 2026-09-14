"""Small retrieval smoke evaluation, not clinical answer validation. No generation."""
import json
from pathlib import Path
from app import Corpus, load_env
from hybrid import HybridSearch, VectorIndex

CASES = [
    ('임신 관련 주의사항', '임신'),
    ('주사 맞는 날을 깜빡했어요', '잊은'),
    ('아기에게 모유를 먹이고 있어요', '수유'),
    ('급성 췌장염', '췌장염'),
    ('다른 약과 같이 써도 되는지 궁금해요', '상호작용'),
    ('너무 많이 주사했을 때', '과량'),
    ('위고비를 맞을 수 있는 대상', '체질량지수'),
    ('배가 메스껍고 토할 것 같아요', '오심'),
]

if __name__ == '__main__':
    load_env()
    corpus = Corpus(preview=True)
    hybrid = HybridSearch(corpus, VectorIndex(corpus.docs))
    rows = []
    for question, marker in CASES:
        baseline = corpus.search(question)
        hits, mode, reason = hybrid.search(question)
        rows.append({'question': question, 'expected_marker': marker,
                     'bm25_hit_at_3': any(marker in doc['text'] for doc in baseline),
                     'hybrid_hit_at_3': any(marker in doc['text'] for doc in hits),
                     'mode': mode, 'fallback': reason, 'result_ids': [doc['id'] for doc in hits]})
    report = {'note': 'Keyword-in-parent smoke metric; not human-reviewed relevance or medical accuracy.',
              'cases': rows,
              'bm25_hits': sum(row['bm25_hit_at_3'] for row in rows),
              'hybrid_hits': sum(row['hybrid_hit_at_3'] for row in rows)}
    target = Path(__file__).with_name('cache') / 'retrieval-evaluation.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'BM25={report["bm25_hits"]}/{len(rows)} Hybrid={report["hybrid_hits"]}/{len(rows)}')
    print('Hybrid calls:', sum(row['mode'] == 'hybrid' for row in rows))
