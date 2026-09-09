# 프론트 선택 복구 보고서

기준: e94e4a2 / 작업 HEAD: aba8bfe. 전체 checkout/revert, commit, push, 서버 배포 없음.

## 검증

- npm run build 통과 (253 modules). 500 kB 초과 chunk 경고는 남음.
- docker compose config --quiet: exit 0. JSON 파싱으로 80 포트, /api 빌드 인자, 필수 backend 환경값 존재, Planner URL 확인. secret 출력 없음. Docker 사용자 config 읽기 권한 경고 존재.
- OAuth 시작: /oauth2/authorization/{provider}. 운영 nginx 및 개발 Vite 프록시 연결 확인. 실제 공급자 로그인 미실행.
- Dashboard → WeeklyPlanner, DashboardChatWidget → WegovyChatPage → ragApi → /rag-api 정적 연결 및 빌드 확인. 식단/운동 SavedPlanPanel 확인. 실사용 인증·생성 E2E 미실행.
- application.yaml / application-prod.yaml: 기존 계층 및 Gemini, naver.search, port, prod/frontend-url 참조를 읽기 검토. 변경 없음. 별도 YAML 파서 검증은 로컬 파서 부재로 미실행.
- git diff --check 통과.

## 유지한 변경

현재 Header/관리자/의사 메뉴, AuthLayout 로고, 관리자 스타일, 의사 API 계약, OAuth URL token 처리 유지. refresh API가 없는 현재 backend에 과거 refresh-cookie 코드를 이식하지 않음. 기존 Dockerfile/nginx 및 RAG 코드는 변경하지 않음.

## 파일별 이유 및 상태

M=수정, D=기존 경로 삭제, ??=새로 복구/이동한 미추적 파일.

| 상태 | 파일 | 이유 |
|---|---|---|
| M | .env.example | 실제 secret 없이 지도·Gemini·RAG·선택 검색 변수 안내 추가 |
| M | compose.yaml | 운영 80 포트 및 OAuth/Gemini/Frontend/Planner 환경 전달 |
| M | stevil-frontend/src/api/axiosInstance.js | 현재 localStorage 토큰 계약 유지, 복원 Dashboard용 clearAccessToken 제공 |
| M | stevil-frontend/src/components/diet/DietManagement.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/diet/DietManagement.jsx | 현재 검색 구현 유지, 저장 식단 패널 연결 |
| M | stevil-frontend/src/components/header/Header.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/home/features/FeaturesSection.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/home/hero/HeroSection.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/home/howItWorks/HowItWorksSection.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/home/partnership/PartnershipSection.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/home/partnership/modal/PartnershipInquiryModal.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/home/safety/SafetySection.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/components/injectionDiary/InjectionDiary.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/main.jsx | 공통 복원 스타일 로딩 |
| D | stevil-frontend/src/pages/Dashboard.css | 하위 도메인 디렉토리로 복원/이동하여 구형 루트 파일 정리 |
| D | stevil-frontend/src/pages/Dashboard.jsx | 하위 도메인 디렉토리로 복원/이동하여 구형 루트 파일 정리 |
| D | stevil-frontend/src/pages/ExerciseManagement.css | 하위 도메인 디렉토리로 복원/이동하여 구형 루트 파일 정리 |
| D | stevil-frontend/src/pages/ExerciseManagement.jsx | 하위 도메인 디렉토리로 복원/이동하여 구형 루트 파일 정리 |
| D | stevil-frontend/src/pages/HospitalMapPage.css | 하위 도메인 디렉토리로 복원/이동하여 구형 루트 파일 정리 |
| D | stevil-frontend/src/pages/HospitalMapPage.jsx | 하위 도메인 디렉토리로 복원/이동하여 구형 루트 파일 정리 |
| M | stevil-frontend/src/pages/auth/LoginPage.jsx | 상대 OAuth 시작 URL |
| M | stevil-frontend/src/pages/chat/ChatModal.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/pages/community/Community.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/pages/hospital/HospitalMapPage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/pages/mypage/MyPage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/pages/onboarding/OnboardingPage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/pages/partnership/guide/PartnershipGuidePage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/pages/weight/WeightRecordPage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/src/routes/AppRouter.jsx | 현재 메뉴 보존, 복원 페이지 경로 및 위고비 채팅 redirect 연결 |
| M | stevil-frontend/src/styles/theme.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| M | stevil-frontend/vite.config.js | 개발 OAuth/WebSocket/RAG 프록시 및 Planner 대기시간 |
| ?? | stevil-frontend/src/api/dashboardApi.js | 대시보드/광고 API 분리 복원 |
| ?? | stevil-frontend/src/pages/dashboard/Dashboard.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| ?? | stevil-frontend/src/pages/dashboard/Dashboard.jsx | e94e4a2 분리형 Dashboard 및 Planner/RAG 렌더링 복원 |
| ?? | stevil-frontend/src/pages/exerciseManagement/ExerciseManagement.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| ?? | stevil-frontend/src/pages/exerciseManagement/ExerciseManagement.jsx | 현재 페이지 유지하며 도메인 폴더 이동, 저장 운동 패널 연결 |
| ?? | stevil-frontend/src/pages/hospitalMap/HospitalMapPage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| ?? | stevil-frontend/src/pages/hospitalMap/HospitalMapPage.jsx | 현재 페이지 유지하며 도메인 폴더와 상대 import 복원 |
| ?? | stevil-frontend/src/pages/rag/WegovyChatPage.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |
| ?? | stevil-frontend/src/pages/rag/WegovyChatPage.jsx | 기존 DashboardChatWidget의 누락된 채팅 페이지 복원 |
| ?? | stevil-frontend/src/styles/site-refresh.css | e94e4a2 화면 스타일/테마 복원 또는 페이지 폴더 이동 |

## git diff --stat

미추적 복구 파일은 Git 기본 diff 통계에 포함되지 않음. 위 ?? 목록을 함께 확인해야 함.

```text
.env.example                                       |  12 +-
 compose.yaml                                       |  14 +-
 stevil-frontend/src/api/axiosInstance.js           |   4 +-
 .../src/components/diet/DietManagement.css         |   2 +-
 .../src/components/diet/DietManagement.jsx         |   2 +
 stevil-frontend/src/components/header/Header.css   |  52 +-
 .../components/home/features/FeaturesSection.css   |  30 +-
 .../src/components/home/hero/HeroSection.css       |   8 +-
 .../home/howItWorks/HowItWorksSection.css          |  20 +-
 .../home/partnership/PartnershipSection.css        |  18 +-
 .../partnership/modal/PartnershipInquiryModal.css  |   8 +-
 .../src/components/home/safety/SafetySection.css   |  22 +-
 .../components/injectionDiary/InjectionDiary.css   |   2 +-
 stevil-frontend/src/main.jsx                       |   2 +
 stevil-frontend/src/pages/Dashboard.css            | 683 ---------------------
 stevil-frontend/src/pages/Dashboard.jsx            | 459 --------------
 stevil-frontend/src/pages/ExerciseManagement.css   | 596 ------------------
 stevil-frontend/src/pages/ExerciseManagement.jsx   | 477 --------------
 stevil-frontend/src/pages/HospitalMapPage.css      | 381 ------------
 stevil-frontend/src/pages/HospitalMapPage.jsx      | 464 --------------
 stevil-frontend/src/pages/auth/LoginPage.jsx       |   2 +-
 stevil-frontend/src/pages/chat/ChatModal.css       |   2 +-
 stevil-frontend/src/pages/community/Community.css  |   2 +-
 .../src/pages/hospital/HospitalMapPage.css         |  10 +-
 stevil-frontend/src/pages/mypage/MyPage.css        |   2 +-
 .../src/pages/onboarding/OnboardingPage.css        |  10 +-
 .../partnership/guide/PartnershipGuidePage.css     |  26 +-
 .../src/pages/weight/WeightRecordPage.css          |   8 +-
 stevil-frontend/src/routes/AppRouter.jsx           |   9 +-
 stevil-frontend/src/styles/theme.css               |  35 +-
 stevil-frontend/vite.config.js                     |  19 +-
 31 files changed, 178 insertions(+), 3203 deletions(-)
```

## git diff --name-status

```text
M	.env.example
M	compose.yaml
M	stevil-frontend/src/api/axiosInstance.js
M	stevil-frontend/src/components/diet/DietManagement.css
M	stevil-frontend/src/components/diet/DietManagement.jsx
M	stevil-frontend/src/components/header/Header.css
M	stevil-frontend/src/components/home/features/FeaturesSection.css
M	stevil-frontend/src/components/home/hero/HeroSection.css
M	stevil-frontend/src/components/home/howItWorks/HowItWorksSection.css
M	stevil-frontend/src/components/home/partnership/PartnershipSection.css
M	stevil-frontend/src/components/home/partnership/modal/PartnershipInquiryModal.css
M	stevil-frontend/src/components/home/safety/SafetySection.css
M	stevil-frontend/src/components/injectionDiary/InjectionDiary.css
M	stevil-frontend/src/main.jsx
D	stevil-frontend/src/pages/Dashboard.css
D	stevil-frontend/src/pages/Dashboard.jsx
D	stevil-frontend/src/pages/ExerciseManagement.css
D	stevil-frontend/src/pages/ExerciseManagement.jsx
D	stevil-frontend/src/pages/HospitalMapPage.css
D	stevil-frontend/src/pages/HospitalMapPage.jsx
M	stevil-frontend/src/pages/auth/LoginPage.jsx
M	stevil-frontend/src/pages/chat/ChatModal.css
M	stevil-frontend/src/pages/community/Community.css
M	stevil-frontend/src/pages/hospital/HospitalMapPage.css
M	stevil-frontend/src/pages/mypage/MyPage.css
M	stevil-frontend/src/pages/onboarding/OnboardingPage.css
M	stevil-frontend/src/pages/partnership/guide/PartnershipGuidePage.css
M	stevil-frontend/src/pages/weight/WeightRecordPage.css
M	stevil-frontend/src/routes/AppRouter.jsx
M	stevil-frontend/src/styles/theme.css
M	stevil-frontend/vite.config.js
```

## 새로 복구/이동된 파일

- stevil-frontend/src/api/dashboardApi.js
- stevil-frontend/src/pages/dashboard/Dashboard.css
- stevil-frontend/src/pages/dashboard/Dashboard.jsx
- stevil-frontend/src/pages/exerciseManagement/ExerciseManagement.css
- stevil-frontend/src/pages/exerciseManagement/ExerciseManagement.jsx
- stevil-frontend/src/pages/hospitalMap/HospitalMapPage.css
- stevil-frontend/src/pages/hospitalMap/HospitalMapPage.jsx
- stevil-frontend/src/pages/rag/WegovyChatPage.css
- stevil-frontend/src/pages/rag/WegovyChatPage.jsx
- stevil-frontend/src/styles/site-refresh.css

## 미해결 / 후속 조치

- planner/snacks.json 미복구. 참조: stevil-backend/src/main/java/com/my/stevil_back/planner/controller/PlannerController.java:21 (GET /api/planner/snacks), stevil-backend/src/test/java/com/my/stevil_back/planner/validation/PlannerMealTest.java:17. 프론트 api/plannerApi.js의 loadSnackCatalog가 이 API를 호출. 간식 기능은 후속 조치 필요.
- 의사 REST 경로 통일 및 refresh-cookie 인증 복원은 backend 변경을 동반하므로 이번 범위에서 제외.
- 실제 로그인 후 Planner 생성/저장, RAG 응답 확인과 서버 배포는 미실행.
- DesignPreview는 필수 운영 기능이 아니므로 복구 제외.
- 실제 .env 수정 없음. RAG 별도 Compose 실행 시 전용 --env-file로 GEMINI_MODEL/RAG_DATABASE_URL 등을 공급해야 함. 운영 stevil_default 연결은 읽기 확인됨.
- 번들 크기 최적화 후속 검토.
