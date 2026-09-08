# 위고비 출처 챗봇 — 개발 프로토타입

Python 3.10 이상, 추가 패키지 없이 실행하는 JSON API입니다. 화면은 `stevil-frontend/src/pages/rag/WegovyChatPage.jsx`에서 담당합니다.

## 실행

이 폴더에서 API를 실행합니다. 8091 포트는 JSON 요청만 받으며 HTML 페이지를 제공하지 않습니다.

```powershell
..\.venv\Scripts\python.exe app.py --preview
```

`--preview`는 **검토 전 원본 사용을 명시적으로 허용하는 개발 모드**입니다. 옵션 없이 실행하면 승인된 자료만 검색합니다. 원본 및 수집 보고서를 수정하지 않습니다.

별도 터미널에서 `stevil-frontend` 폴더로 이동해 `npm run dev`를 실행하고 http://localhost:3000/wegovy-chat 을 엽니다. Vite가 `/rag-api/chat`을 Python의 `/api/chat`으로 전달합니다. 기존 `/api`는 Spring 서버를 계속 사용합니다. Vite 설정 변경 후에는 개발 서버를 재시작하세요.

## Gemini 연결

**키를 붙여넣는 파일: `data-collection/wegovy/rag/.env`**

```dotenv
GEMINI_API_KEY=본인의_API_키
GEMINI_MODEL=AI_Studio에서_사용할_모델_ID
```

이 파일은 Git에서 제외됩니다. 없으면 `.env.example`을 `.env`로 복사하세요. **React의 `.env`나 `VITE_` 변수에 API 키를 넣지 마세요.** Python 시작 시 해당 파일을 읽습니다. 저장 후 Python 서버를 재시작하세요. 이미 설정한 시스템 환경변수가 있으면 파일보다 우선합니다.

키와 모델을 설정하면 질문 및 검색된 원문 구간을 Google Gemini API에 전송합니다. 실제 요청은 과금될 수 있습니다. 키 또는 모델이 없거나 생성 요청이 실패하면 원문 검색 결과로 돌아갑니다. 오류에 API 키나 질문을 기록하지 않습니다.

공식 API: https://ai.google.dev/api/generate-content

## 현재 구현 범위

- 실행 보고서와 원본 SHA-256 대조, 국내 MFDS HTML 3개에서 효능효과·용법용량·주의사항 추출.
- 번호가 붙은 절 단위 분할, 표의 행·열 구분 보존. 표 병합 셀의 의미 및 제품별 차이는 별도 검토 필요.
- 한국어 BM25 + Gemini 임베딩 코사인 검색을 RRF(순위 합산)로 통합하고 동일 원문을 중복 제거.
- 원문 링크·문서명·절·수집일·개정일·최신성·검토 상태 표시.
- Gemini 생성 초안에 출처 번호 검사. 번호의 존재는 문장과 근거의 의미적 일치까지 보증하지 않음.
- 모델 미설정 시 생성 답변 없이 관련 원문 제공. 질문마다 독립 검색하며 대화 기록은 저장하지 않음.
- 127.0.0.1 전용 개발 서버. 공개 배포용 인증·속도 제한·운영 모니터링은 포함하지 않음.
- 현재 프록시는 Vite 개발 환경용입니다. Docker/nginx 운영 환경은 별도 RAG 서비스 배치와 인증을 포함한 프록시 구성이 필요합니다.

미국·유럽 PDF, SELECT 논문, EMA NAION 공지도 개발 검색에 포함합니다. 제조사 제품 목록과 다운로드 실패 자료는 제외합니다. `summary/notes.jsonl`은 사용하지 않습니다.

## 검토 및 운영 전 남은 작업

원본 최신성·제품 범위·추출 품질 및 의료 검토 후 `sources.json`의 해당 항목에 `ingest_ready: true`와 검토한 원본의 `approved_sha256`을 함께 설정해야 승인 모드에 포함됩니다. 자동으로 승인하지 않습니다. 수집일은 개정일이 아닙니다.

질문별 검색 정확도 평가, 개인별 처방 질문 처리 검증, 생성 문장과 출처의 의미적 일치 평가가 필요합니다. 승인 모드도 이 프로토타입을 의료 서비스로 배포할 수 있다는 뜻은 아닙니다.

## 점검

```powershell
..\.venv\Scripts\python.exe app.py --preview --check
..\.venv\Scripts\python.exe -m unittest discover -s . -v
```

API: `GET /api/status`, `POST /api/chat` (JSON: `{"question":"임신 관련 주의사항"}`). 키 없이 원문 검색과 출처 반환을 테스트할 수 있습니다.

## 하이브리드 검색

`gemini-embedding-001`의 768차원 임베딩을 사용합니다. 문서는 RETRIEVAL_DOCUMENT, 질문은 RETRIEVAL_QUERY로 요청합니다. 기존 Gemini 키를 그대로 사용하며 생성 모델 설정과 독립적입니다.

```powershell
..\.venv\Scripts\python.exe app.py --preview --build-index
..\.venv\Scripts\python.exe app.py --preview
```

첫 명령은 공개 원문을 Gemini로 전송하여 임베딩을 생성합니다(과금 가능). `cache/embeddings.sqlite3`에 모델·차원·텍스트 해시별로 저장하므로 변경되지 않은 구간은 재요청하지 않습니다. 실패 시 재실행하면 완료된 구간부터 이어갑니다. 자료가 변경되면 색인을 다시 만들고 서버를 재시작하세요.

현재 규모에서는 별도 벡터 DB 없이 메모리에서 정확한 코사인 유사도를 계산합니다. 검색용 짧은 구간은 원문 절 또는 PDF 페이지로 연결되며 답변 생성에는 해당 원문을 전달합니다. 캐시의 과거 문서는 현재 승인/원본 검증을 통과한 Corpus에 포함된 경우에만 검색됩니다.

## 추가 자료 추출 및 검색 범위

`prepare_extra.py`를 pypdf가 설치된 Python으로 실행하면 원본 해시를 확인하고 `cache/extracted/`에 페이지·절별 텍스트를 저장합니다. 이 환경에서는 Codex 번들 Python을 사용했습니다. 다른 환경에서는 `pip install pypdf` 후 `python prepare_extra.py`를 실행하세요. 이후 `app.py --preview --build-index`를 실행하고 서버를 재시작합니다. 임베딩은 32개씩 묶어서 요청하며 기존 캐시를 재사용합니다.

- 미국 PDF 28페이지, 유럽 PDF는 표지만 있는 1페이지를 제외한 181페이지를 추출했습니다.
- SELECT는 Abstract, Methods, Results, Discussion을 추출했습니다. EMA는 공지 본문을 추출했습니다.
- PDF 페이지 링크와 국가·발행기관·문서 유형·제형 추정값을 응답 및 React 출처에 표시합니다.
- 기본 질문은 국내 허가사항을 검색합니다. 미국/FDA, 유럽/EMA, 해외/비교 표현은 해당 해외 허가사항을 검색합니다. 연구/SELECT/심혈관 관련 표현은 논문, NAION/시력/안전성 관련 표현은 안전성 공지도 허용합니다. 이 규칙 기반 분류는 모든 표현을 이해하지 못합니다.
- 해외 허가사항을 국내 기준으로, 연구 결과를 허가 기준으로 사용하지 않도록 생성 지침에 명시합니다.
- 제형은 페이지 내 표현으로 추정한 값이며 검증되지 않았습니다. 주사·경구가 섞인 구간에서 용량을 추론하지 않도록 지시합니다. 함량별 정밀 필터는 아직 없습니다.
- PDF 회전 텍스트·그림·복잡한 표는 추출 누락이나 읽기 순서 오류가 있을 수 있습니다. 페이지 경계에서 문장·표가 끊길 수 있어 개별 수치 검토가 필요합니다. 샘플 페이지 육안 점검은 전체 의료 검토를 대체하지 않습니다. 모든 추가 자료는 검토 대기이며 승인 모드에 자동 포함되지 않습니다.

벡터 색인이 없거나 질문 임베딩이 실패하면 BM25를 사용합니다. `/api/status.vector_ready` 및 답변의 `retrieval`(hybrid/bm25), `retrieval_fallback`으로 확인합니다. `--bm25-only`는 질문 임베딩 요청도 끕니다. 질문 임베딩은 디스크에 저장하지 않습니다.

`evaluate_search.py`는 8개 질문으로 BM25와 하이브리드의 상위 3개 결과를 비교하며 보고서를 `cache/retrieval-evaluation.json`에 저장합니다. 실제 Gemini 질문 임베딩 요청이 발생합니다. 원문 키워드 포함 여부를 보는 간단한 점검이며 의료 정확도 평가가 아닙니다. 유사도 0.55는 임시 검색 컷오프이며 추가 평가가 필요합니다.

API 참고: https://ai.google.dev/api/embeddings
