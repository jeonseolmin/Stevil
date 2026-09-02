"""Local evidence-first Wegovy RAG prototype. Python 3.10+, stdlib only."""
import argparse
from collections import Counter
import hashlib
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import re
from urllib.request import Request, urlopen
from hybrid import HybridSearch, VectorIndex
from prompts import SYSTEM_PROMPT
from planner import make_plan
from food_catalog import FoodUnavailable

ROOT = Path(__file__).resolve().parents[1]
SECTIONS = {'_ee_doc': '효능효과', '_ud_doc': '용법용량', '_nb_doc': '사용상의 주의사항'}


def load_env(path=None):
    """Load only server Gemini settings; process environment takes precedence."""
    path = path or Path(__file__).with_name('.env')
    if not path.exists():
        return
    for line in path.read_text(encoding='utf-8-sig').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        name, value = line.split('=', 1)
        if name.strip() in ('GEMINI_API_KEY', 'GEMINI_MODEL', 'RAG_DATABASE_URL', 'FOOD_SAFETY_API_KEY'):
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            if value:
                os.environ.setdefault(name.strip(), value)


class LabelParser(HTMLParser):
    """Read only MFDS label sections; retain table cell/row boundaries."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = {}
        self.active = None
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if self.active is None and attrs.get('id') in SECTIONS:
            self.active = attrs['id']
            self.depth = 1
            self.parts = []
        elif self.active:
            if tag == 'div':
                self.depth += 1
            if tag in ('p', 'tr', 'br', 'table'):
                self.parts.append('\n')
            elif tag in ('td', 'th'):
                self.parts.append(' | ')

    def handle_endtag(self, tag):
        if not self.active:
            return
        if tag in ('p', 'tr', 'table'):
            self.parts.append('\n')
        if tag == 'div':
            self.depth -= 1
            if self.depth == 0:
                lines = [' '.join(line.split()).strip(' |') for line in ''.join(self.parts).splitlines()]
                self.sections[self.active] = '\n'.join(line for line in lines if line)
                self.active = None

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)


def tokens(text):
    words = re.findall(r'[가-힣]+|[a-z]+|\d+(?:\.\d+)?', text.lower())
    return [token for word in words for token in
            ([word] + [word[i:i+2] for i in range(len(word)-1)] if re.fullmatch('[가-힣]+', word) else [word])]


def chunks(text):
    # Split at numbered subsection headings, never in the middle of a sentence or table.
    return [part.strip() for part in re.split(r'\n(?=\d+\.\s)', text) if part.strip()]


class Corpus:
    def __init__(self, root=ROOT, preview=False):
        self.docs = []
        self.status = []
        self.preview = preview
        sources = json.loads((root / 'sources.json').read_text(encoding='utf-8'))
        latest = {}
        for report in sorted((root / 'runs').glob('*.json')):
            for result in json.loads(report.read_text(encoding='utf-8')).get('results', []):
                latest[result['source_id']] = result
        for source in sources:
            result = latest.get(source['id'], {})
            state = {'id': source['id'], 'status': result.get('status', 'not_downloaded'), 'indexed': False}
            self.status.append(state)
            if result.get('status') != 'downloaded_pending_review':
                state['reason'] = result.get('error', '원본 없음')
                continue
            if source['publisher'] != 'MFDS' and source['id'] not in ('us-pi', 'eu-pi', 'select', 'ema-naion'):
                state['reason'] = '답변 근거 대상 아님 (제품 목록 등)'
                continue
            approved = source.get('ingest_ready') is True and source.get('approved_sha256') == result.get('sha256')
            if not preview and not approved:
                state['reason'] = '검토 승인 및 원본 해시 승인 필요'
                continue
            path = (root / result['relative_path']).resolve()
            if not path.is_relative_to((root / 'raw').resolve()):
                state['reason'] = '잘못된 원본 경로'
                continue
            try:
                raw = path.read_bytes()
                if hashlib.sha256(raw).hexdigest() != result['sha256']:
                    raise ValueError('원본 SHA-256 불일치')
                if source['publisher'] == 'MFDS':
                    parser = LabelParser()
                    parser.feed(raw.decode('utf-8-sig'))
                    if set(parser.sections) != set(SECTIONS):
                        raise ValueError('필수 허가사항 구간 누락')
                    records = [dict(section=SECTIONS[section], anchor=section, text=part, formulation='injection', formulation_verified=False)
                               for section, body in parser.sections.items() for part in chunks(body)]
                else:
                    extracted = json.loads((root / 'rag/cache/extracted' / (source['id'] + '.json')).read_text(encoding='utf-8'))
                    if extracted['sha256'] != result['sha256'] or extracted['version'] != 1:
                        raise ValueError('추출 캐시 갱신 필요')
                    records = extracted['records']
                for number, record in enumerate(records, 1):
                        section, part = record['section'], record['text']
                        fragment = '#page=' + str(record['page']) if record.get('page') else '#' + record.get('anchor', '')
                        self.docs.append({
                            'id': f"{source['id']}:{section}:{number}",
                            'source_id': source['id'], 'title': source['title'],
                            'section': section, 'text': part,
                            'url': result['final_url'] + fragment,
                            'collected_at': result['collected_at'],
                            'revision_date': source.get('revision_date'),
                            'latest_version_verified': source.get('latest_version_verified', False),
                            'review_status': 'approved' if approved else 'pending_review',
                            'sha256': result['sha256'], 'jurisdiction': source['jurisdiction'],
                            'publisher': source['publisher'], 'document_type': source['document_type'],
                            'page': record.get('page'), 'formulation': record['formulation'],
                            'formulation_verified': record['formulation_verified'],
                        })
                state['indexed'] = True
            except (OSError, ValueError, KeyError) as error:
                state['reason'] = str(error)
        self.counts = [Counter(tokens(doc['section'] + ' ' + doc['text'])) for doc in self.docs]
        self.df = Counter(token for counts in self.counts for token in counts)
        self.avg = sum(sum(c.values()) for c in self.counts) / max(len(self.docs), 1)

    def eligible_ids(self, question):
        q = question.lower()
        regions = set()
        if re.search(r'미국|\bus\b|\bfda\b', q): regions.add('US')
        if re.search(r'유럽|\beu\b|\bema\b', q): regions.add('EU')
        if re.search(r'해외|외국|비교', q): regions.update(('US', 'EU'))
        if re.search(r'국내|한국|식약처', q) or not regions: regions.add('KR')
        research = bool(re.search(r'연구|논문|select|심혈관|심장|임상|trial', q))
        safety = bool(re.search(r'naion|시력|시신경|눈|안전성|safety', q))
        return {doc['id'] for doc in self.docs if
                (doc['document_type'] == 'label' and doc['jurisdiction'] in regions) or
                (research and doc['document_type'] == 'trial') or
                (safety and doc['document_type'] == 'safety_notice')}

    def search(self, question, limit=3):
        eligible = self.eligible_ids(question)
        query = set(tokens(re.sub(r'위고비|알려줘|알려주세요|궁금해요', '', question)))
        ranked = []
        for doc, counts in zip(self.docs, self.counts):
            if doc['id'] not in eligible: continue
            score = 0
            for token in query & counts.keys():
                freq = counts[token]
                idf = math.log(1 + (len(self.docs) - self.df[token] + .5) / (self.df[token] + .5))
                score += idf * freq * 2.2 / (freq + 1.2 * (.25 + .75 * sum(counts.values()) / self.avg))
            if score > 0:
                ranked.append((score, doc))
        unique = []
        seen = set()
        for score, doc in sorted(ranked, key=lambda item: item[0], reverse=True):
            fingerprint = re.sub(r'\s+', '', doc['text'])
            if fingerprint not in seen:
                unique.append(dict(doc, score=round(score, 3)))
                seen.add(fingerprint)
            if len(unique) == limit:
                break
        return unique


def answer(corpus, question, model=None):
    if getattr(corpus, 'hybrid', None):
        evidence, retrieval, fallback = corpus.hybrid.search(question)
    else:
        evidence, retrieval, fallback = corpus.search(question), 'bm25', None
    response = {'mode': 'evidence', 'preview': corpus.preview, 'sources': evidence,
                'retrieval': retrieval, 'retrieval_fallback': fallback}
    if not evidence:
        return dict(response, answer='지금 가진 자료에서는 질문에 답할 만한 근거를 찾지 못했어요. 궁금한 증상이나 상황을 조금 더 구체적으로 알려주시겠어요?')
    response['answer'] = '질문과 관련된 자료를 찾아봤어요. 아래 출처를 펼치면 원문과 함께 확인하실 수 있어요.'
    if not model:
        return response
    # Citations are assembled by the server, never accepted as model-generated URLs.
    context = [dict(doc, citation=i) for i, doc in enumerate(evidence, 1)]
    prompt = SYSTEM_PROMPT
    user_text = json.dumps({'question': question, 'evidence': context}, ensure_ascii=False)
    try:
        key = os.environ.get('GEMINI_API_KEY')
        if not key:
            raise ValueError('GEMINI_API_KEY not configured')
        if not re.fullmatch(r'[a-zA-Z0-9._-]+', model):
            raise ValueError('Invalid model ID')
        payload = {'systemInstruction': {'parts': [{'text': prompt}]},
                   'contents': [{'role': 'user', 'parts': [{'text': user_text}]}],
                   'generationConfig': {'maxOutputTokens': 2048}}
        request = Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                          data=json.dumps(payload).encode(),
                          headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
        with urlopen(request, timeout=90) as result:
            candidate = json.load(result)['candidates'][0]
            if candidate.get('finishReason') != 'STOP':
                raise ValueError('Incomplete generation')
            generated = '\n'.join(part.get('text', '') for part in candidate['content']['parts'] if not part.get('thought'))
        refs = [int(n) for n in re.findall(r'\[(\d+)\]', generated)]
        if not refs or any(n < 1 or n > len(evidence) for n in refs):
            raise ValueError('출처 번호 검증 실패')
        response.update(answer=generated, mode='generated_draft')
    except (OSError, ValueError, KeyError, TypeError, IndexError):
        response['notice'] = '생성 모델 응답을 사용할 수 없어 원문 검색 결과를 표시합니다.'
    return response


def serve(corpus, port, model, host='127.0.0.1'):
    class Handler(BaseHTTPRequestHandler):
        def send(self, code, data, mime='application/json; charset=utf-8'):
            body = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path == '/api/status':
                return self.send(200, {'preview': corpus.preview, 'chunks': len(corpus.docs), 'sources': corpus.status, 'model': model,
                                       'generation_ready': bool(model and os.environ.get('GEMINI_API_KEY')),
                                       'vector_ready': bool(getattr(corpus, 'hybrid', None) and corpus.hybrid.index.ready)})
            self.send(404, {'error': 'Not found'})

        def do_POST(self):
            if self.path not in ('/api/chat', '/api/plan'):
                return self.send(404, {'error': 'Not found'})
            if self.headers.get('Origin') not in (None, f'http://127.0.0.1:{port}', f'http://localhost:{port}',
                                                 'http://localhost:3000', 'http://127.0.0.1:3000'):
                return self.send(403, {'error': 'Origin not allowed'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16384:
                    raise ValueError()
                data = json.loads(self.rfile.read(length))
                if self.path == '/api/plan':
                    try:
                        return self.send(200, make_plan(data, model))
                    except FoodUnavailable as error:
                        return self.send(503, {'error': str(error), 'code': 'FOOD_NOT_READY'})
                    except (ValueError, KeyError, TypeError):
                        return self.send(400, {'error': '입력 정보 또는 AI 계획 형식을 확인해 주세요.'})
                    except (OSError, RuntimeError, IndexError):
                        return self.send(503, {'error': 'AI 계획을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'})
                question = data.get('question') if isinstance(data, dict) else None
                if not isinstance(question, str) or not 2 <= len(question.strip()) <= 1000:
                    raise ValueError()
                self.send(200, answer(corpus, question.strip(), model))
            except (ValueError, UnicodeError):
                self.send(400, {'error': '질문은 2~1000자로 입력해 주세요.'})

        def log_message(self, *args):
            pass  # Do not log health questions.

    print(f'http://127.0.0.1:{port} | chunks={len(corpus.docs)} | preview={corpus.preview}', flush=True)
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == '__main__':
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true', help='Use unreviewed MFDS files for local development')
    parser.add_argument('--port', type=int, default=8091)
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--model', default=os.environ.get('GEMINI_MODEL'), help='Gemini model ID; requires GEMINI_API_KEY')
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--build-index', action='store_true', help='Create cached document embeddings, then exit')
    parser.add_argument('--bm25-only', action='store_true', help='Disable query embedding requests')
    args = parser.parse_args()
    corpus = Corpus(preview=args.preview)
    if not args.bm25_only:
        if os.environ.get('RAG_DATABASE_URL') and not args.build_index:
            from postgres_store import PostgresIndex
            index = PostgresIndex(corpus.docs)
        else:
            index = VectorIndex(corpus.docs)
        corpus.hybrid = HybridSearch(corpus, index)
    if args.build_index:
        if args.bm25_only:
            parser.error('--build-index cannot be used with --bm25-only')
        print('New embeddings:', corpus.hybrid.index.build(batch_size=32))
    elif args.check:
        print(json.dumps({'chunks': len(corpus.docs), 'sources': corpus.status}, ensure_ascii=False, indent=2))
    else:
        serve(corpus, args.port, args.model, args.host)
