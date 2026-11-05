# Stevil

위고비(GLP-1) 투약 중인 사람의 다이어트를 돕는 건강 관리 서비스입니다.
온보딩에서 받은 체중·목표로 식단과 운동을 계획하고, 투약 일지·체중 기록·의료진 리포트,
논문과 식약처 자료 기반 AI 질의응답, 병원·약국 찾기를 한곳에서 제공합니다.

- 개발 기간: 2026.08.03 ~ 2026.09.28
- 팀장: 전설민 ([@jeonseolmin](https://github.com/jeonseolmin))

## 주요 기능

| 영역 | 기능 |
|---|---|
| 회원 | Google·Naver·Kakao 소셜 로그인, JWT Access/Refresh Token, 온보딩(체중·목표) |
| 대시보드 | 체중 추이 차트, 오늘의 식단·운동, 대시보드에서 바로 AI에게 질문 |
| 플래너 | AI 주간 식단·운동 캘린더, 영양 목표 동기화, 식약처 식품 API로 메뉴 확장 |
| AI | 위고비 논문·식약처 자료 RAG 챗봇(출처 표시), 식단 AI 코치 |
| 기록 | 투약 일지, 체중 기록, 운동 관리, 의료진용 리포트 |
| 지도 | 제휴 병원·약국 찾기(Naver Maps) |
| 소통 | 커뮤니티 게시판·댓글, 실시간 채팅(WebSocket/STOMP) |
| 알림 | FCM 웹 푸시, 개인 리마인더 스케줄러 |
| 관리자 | 회원·신고 관리, 건강 콘텐츠, 제휴 문의, 약국 관리 |

## 기술 스택

| 분야 | 기술 |
|---|---|
| Backend | Java 21, Spring Boot 4.1, Spring Security, OAuth2 Client, Spring Data JPA, JWT(jjwt), WebSocket(STOMP), Spring Mail, Firebase Admin(FCM) |
| Frontend | React 19, Vite, React Router, Axios, Chart.js, STOMP·SockJS, Firebase(웹 푸시) |
| AI | Python, Gemini(답변 생성·임베딩 `gemini-embedding-001`), 하이브리드 검색(코사인 + RRF), FastAPI, LangChain, Chroma |
| Database | PostgreSQL 17, pgvector(RAG 벡터 저장) |
| Infra | Docker Compose, Nginx(HTTPS, Let's Encrypt), AWS EC2, GitHub Actions |
| Test | JUnit 5, Playwright, pytest |
| 외부 API | Naver Maps, 식약처 식품영양성분DB(공공데이터포털), Google·Naver·Kakao OAuth |

## 아키텍처

```text
Browser (React)
   │  HTTPS 443
Nginx ─┬─ /                    → React 정적 빌드
       ├─ /api, /ws-stomp,
       │  /oauth2, /login      → backend (Spring Boot, :8080) ── PostgreSQL 17
       │                            └─ /api/plan → rag-api (플래너 생성)
       ├─ /rag-api  (로그인 확인) → rag-api (Python, :8091) ── PostgreSQL + pgvector
       └─ /diet-api (로그인 확인) → diet-ai (FastAPI, :8092) ── Chroma
```

AI 서버는 Spring을 거치지 않고 Nginx가 직접 연결하지만, `auth_request`로 백엔드 `/api/users/me`를 먼저 호출해
로그인한 사용자만 통과시킵니다.

## 폴더 구조

```text
stevil-backend/        Spring Boot API (기능별 패키지: auth, user, planner, diet, chat, admin ...)
stevil-frontend/       React + Vite 앱, nginx.conf
data-collection/
  ai-services/rag/     논문·식약처 RAG 서버, 플래너 생성 (/api/chat, /api/plan)
  ai-services/diet/    식단 AI 코치 (FastAPI)
  wegovy/              RAG 원본 자료 수집 기록
  DB/                  운동 데이터 CSV
deploy/                운영 배포 보조 파일
docs/                  인수인계(handoff), QA 기록
compose.yaml           postgres + backend + frontend
```

## 실행 방법

### 1. 환경변수

```sh
cp .env.example .env   # DB, OAuth, JWT, GEMINI_API_KEY 등 값 채우기 (커밋 금지)
```

### 2. Docker Compose (backend + frontend + DB)

```sh
docker compose up -d --build
```

### 3. 로컬 개발

```sh
# DB만 컨테이너로
docker compose up -d postgres

# backend (local 프로필)
cd stevil-backend
./gradlew bootRun --args='--spring.profiles.active=local'

# frontend
cd stevil-frontend
npm ci
npm run dev
```

AI 서버는 각 폴더의 README를 따릅니다: `data-collection/ai-services/rag/`, `data-collection/ai-services/diet/README.md`.

## 테스트

```sh
cd stevil-backend && ./gradlew test     # JUnit
cd stevil-frontend && npm run test:e2e   # Playwright
```

## 배포

`main`에 backend·frontend 변경이 머지되면 GitHub Actions(`.github/workflows/deploy.yml`)가
백엔드 테스트와 프론트 빌드를 확인한 뒤 SSH로 EC2에 Compose 컨테이너를 다시 올립니다.
RAG·식단 AI 서버는 이 자동 배포에 포함되지 않고 따로 배포합니다.
