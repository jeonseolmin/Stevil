import json
import urllib.request

request = urllib.request.Request('http://127.0.0.1:8091/api/chat', data=json.dumps({'question': '위고비는 어떤 약인가요?'}).encode(), headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(request, timeout=100) as response:
    result = json.load(response)
print(json.dumps({key: result.get(key) for key in ('mode', 'retrieval', 'answer')}, ensure_ascii=False))
print('source_count=', len(result.get('sources', [])))
assert result.get('answer') and result.get('sources')
