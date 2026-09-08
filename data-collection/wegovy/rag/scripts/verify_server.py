"""Smoke checks on the server; no private user questions or credentials logged."""
import json
from urllib.request import Request, urlopen

for question in ['주사 맞는 날을 깜빡했어요', '미국 허가사항 임신 주의사항']:
    request = Request('http://127.0.0.1:8091/api/chat',
                      data=json.dumps({'question': question}).encode(),
                      headers={'Content-Type': 'application/json'})
    with urlopen(request, timeout=110) as response:
        result = json.load(response)
    print(json.dumps({'retrieval': result['retrieval'], 'fallback': result.get('retrieval_fallback'),
                      'mode': result['mode'], 'source_count': len(result['sources']),
                      'countries': [doc['jurisdiction'] for doc in result['sources']]}, ensure_ascii=False))
    assert result['retrieval'] == 'hybrid' and result['mode'] == 'generated_draft'
    assert result['sources']
