# FCM 알림 / Reminder 작업 인계 문서

작성: 2026-09-21 (집에서 이어서 작업하기 위한 자체 완결형 문서. 대화 내용이나 로컬 메모리가 없어도 이 문서만으로 이어갈 수 있게 정리)

> 이 문서에는 **비밀 값이 없다**. service account JSON 내용, 파일명, private key, project ID는 일부러 적지 않았다.

---

## 1. 한눈에 보는 현재 상태

| 단계 | 내용 | 상태 |
|---|---|---|
| PR-A | 알림/기기 토큰 기반 (Notification, UserDevice, PushSender/Noop, AFTER_COMMIT 리스너, `/api/notifications/**`) | **머지됨** (PR #30, `a77ea1a`) |
| PR-B | Firebase Admin FCM 전송 (기본 OFF) | **PR #31 오픈, 머지 대기** (`feature/fcm-delivery`, 커밋 `d9c2f8e`) |
| PR-C | Personal Reminder Scheduler | **설계 확정 대기** (코드 없음, 아래 §5) |
| PR-D | 프론트 웹푸시(Firebase Web SDK, service worker, 토큰 등록, 알림 UI) | 미착수 |

브랜치 기준(2026-09-21 확인 시점):
- `origin/local/design-preview` = `a77ea1a7b6c7182e9b52e377dd3988e072708cae`
- `origin/main` = `39c0a4c5a17476996177326b8b66dff4fdeb8b11` (운영 배포 브랜치, 이번 작업으로 배포 발생 없음)
- PR #31: https://github.com/jeonseolmin/Stevil/pull/31 — base `local/design-preview` ← head `feature/fcm-delivery`, 커밋 1개, 파일 19개, +1,272/-8, 충돌 없음, checks 0개

**운영에서 실제 FCM 발송은 아직 꺼져 있다.** (`STEVIL_FIREBASE_ENABLED` 기본 false)

배포 구조 참고: `feature/* → local/design-preview`(배포 없음) → PR → `main`(여기서만 자동 배포, `deploy.yml`은 main push에서만 실행). 서버는 `~/Stevil` 이 `main` 브랜치.

---

## 2. 지켜야 할 규칙 (프로젝트 CLAUDE.md + 사용자 지시)

- 코드 수정 전에 기존 구현을 먼저 읽는다. 최소 변경, 무관한 리팩터링 금지.
- 옛 테스트를 위해 호환 생성자/프로덕션 되돌리기 금지. 테스트를 삭제/비활성/약화 금지 (테스트를 현재 시그니처에 맞춰 수정).
- 백엔드 변경 후: `stevil-backend`에서 `.\gradlew.bat compileJava compileTestJava` → 관련 테스트 → 전체 테스트.
- `.env` 생성/수정 금지. 비밀번호/API 키/서비스 계정 키를 출력/요청/하드코딩 금지.
- commit/push는 사용자가 요청했을 때만. force push 금지. main 직접 수정 금지.
- 기존 `common.notification.service.NotificationService` 는 이름 변경/교체 금지.
- 새 작업은 항상 **최신 `origin/local/design-preview` 기준 별도 worktree + 새 브랜치** (`git fetch --prune` 후).
- 사용자 승인 없이 merge/배포/원격 설정 변경 금지. 위험 작업 전에는 먼저 보고.

---

## 3. 환경 / 도구 메모 (집 PC에서 이어갈 때)

- 백엔드: Spring Boot 4.1.0, Java 21, Gradle 9.5.1, PostgreSQL, `ddl-auto: update` (마이그레이션 도구 없음), Jackson 2/3 공존.
- **기존부터 실패하는 테스트 2건** (base에서도 동일 원인으로 실패, 신규 실패가 아님):
  - `StevilBackApplicationTests.contextLoads` — `HibernateException: Unable to determine Dialect without JDBC metadata` (DB 없음)
  - `PlannerMealTest.publishedSnacksHaveValidEvidenceAndPersistAsSnackEvents` — `expected true but was false`
  - PR-B 기준 전체 테스트 146개 중 이 2건만 실패.
- 테스트용 H2는 `testRuntimeOnly`(운영 jar에는 포함 안 됨). DB가 필요한 통합 테스트는 `@DataJpaTest` + `@ActiveProfiles("test")`, 실제 커밋이 필요하면 `@Transactional(propagation = NOT_SUPPORTED)` + `@AfterEach` 정리.
- Mockito: 인자 안에서 mock을 새로 만들면 `UnfinishedStubbingException`. 별도 메서드에서 스텁할 것.
- `gh` CLI가 설치돼 있지 않다. PR은 GitHub 웹에서 만든다 (compare URL 사용).
  - 예: `https://github.com/jeonseolmin/Stevil/compare/local/design-preview...<브랜치>?expand=1`
- Windows Git Bash에서 긴 heredoc(한글/따옴표 섞임)이 깨질 수 있다 → 파일은 에디터/Write 도구로 만든다.
- 이 저장소의 CRLF/LF 혼재: 기존 파일은 CRLF 유지, 새 파일은 LF로 써도 git이 정규화 경고만 낸다.

---

## 4. PR-A / PR-B 구현 요약 (이미 구현된 것)

### PR-A (머지됨)
패키지 `com.my.stevil_back.notification`
- 엔티티: `Notification`(user, type, title≤100, body≤500, targetUrl nullable(내부 `/` 경로만), readAt nullable), `UserDevice`(fcmToken unique ≤1024, platform WEB/ANDROID/IOS, lastUsedAt)
- 서비스: `UserNotificationService`(create/list/unreadCount/markRead/markAllRead), `UserDeviceService`(등록/재등록/소유권 이전/사용자당 10개 제한/유니크 경쟁 재시도)
- API: `POST/DELETE /api/notifications/token`, `GET /api/notifications`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/{id}/read`, `PATCH /api/notifications/read-all` (인증 필수, 남의 알림은 404)
- `PushSender` 인터페이스, `NotificationCreatedEvent(notificationId, userId)`, `NotificationPushListener`(AFTER_COMMIT, 모든 예외 catch)
- 새 테이블: `notifications`, `user_devices`

### PR-B (PR #31, 머지 대기)
- 의존성: `firebase-admin:9.10.0` (Firestore/Storage 제외) + `google-http-client-jackson2:2.1.0` 명시. bootJar +약 13.6MB.
- `FirebaseProperties`(`stevil.firebase.enabled` 기본 false, `credentials-path`), `FirebaseConfig`(PushSender bean 선택):
  - disabled → `NoopPushSender`
  - enabled + credential 정상 → `FcmPushService`
  - enabled + credential 누락/빈 파일/손상 → **ERROR 로그 + `NoopPushSender` 강등 (백엔드 기동은 계속)**. 로그에는 고정 사유·예외 클래스명·projectId만.
- `FcmPushService`: `sendEachForMulticast`, 500개 chunk, notification(title/body) + data(`notificationId`, `targetUrl`), 재시도 없음.
- 오류 처리: `UNREGISTERED`, `SENDER_ID_MISMATCH` → 토큰 삭제(소유자 조건). 그 외(`INVALID_ARGUMENT`, 인증/권한, quota/unavailable/internal/timeout) → 토큰 유지 + 로그.
- `NotificationAsyncConfig`: `notificationPushExecutor`(core 2 / max 4 / queue 500, 큐 초과 시 버리고 WARN), 리스너에 `@Async`.
- 정지(suspended) 계정: 알림은 저장, push만 skip, 토큰 유지.
- compose: `firebase_service_account` secret, 기본값은 빈 placeholder(`deploy/firebase-credentials.placeholder`) → 키 없이도 어느 OS에서든 `docker compose` 동작.
- `.gitignore`에 `*firebase-adminsdk*.json`, `*service-account*.json` 추가, `.env.example`에 토글/경로 이름 추가, `application.yaml`에 `stevil.firebase.*`.
- 테스트 30개 신규(분류기, FcmPushService, FirebaseConfig, 비동기/큐 초과/정지 계정, 종단 흐름). 실제 Firebase 네트워크 호출 없음.

---

## 5. PR-C 최종 설계 (Personal Reminder Scheduler) — **구현 전, 확정 답변 대기**

### 5.1 확정된 결정
- grace window **10분** (`stevil.reminder.grace-minutes=10`): 10분 이내 catch-up, 초과 `SKIPPED_MISSED`. Reminder당 1회만 처리 후 `nextFireAt`을 미래로 전진 (몰아서 발송 금지).
- 정지 계정: scheduler 단계에서 차단 → Notification 생성 X, PushSender 호출 X, `ReminderDelivery`에 `SKIPPED_SUSPENDED`, 토큰 삭제 X, `nextFireAt` 정상 전진. (PR-B의 일반 push skip은 유지.)
- Planner 유래(source=PLANNER) Reminder: DELETE 400, `enabled=false`만 가능. 슬롯이 사라지면 휴면(`nextFireAt=NULL`). 사용자의 `enabled`는 Planner 동기화가 덮어쓰지 않음. USER 유래는 정상 삭제.
- HOSPITAL: PR-C에서 1회성 날짜 예약 구현 안 함. enum은 유지, USER API의 HOSPITAL 생성은 400. 후속 PR에서 1회성/one-shot 설계.
- Planner 연결: `PlannerService.save()` → `PlannerSavedEvent` → AFTER_COMMIT → `ReminderPlannerSyncListener` → `ReminderSyncService`. Reminder 동기화 실패가 Planner 저장을 깨면 안 됨. `PlannerService`가 `ReminderService`를 직접 호출하지 않음.
- `ReminderDelivery` 60일 보관 + cleanup job. Notification 보관 정책은 건드리지 않음.
- 사용자당 Reminder 한도 20개: **USER 유래만 카운트**. PLANNER 유래는 시스템 생성이라 별도 상한.
- 유지: `ReminderDelivery` UNIQUE `(reminder_id, scheduled_date, scheduled_time)`(중복 방지 최종 방어선), `@Scheduled(fixedDelay=60_000)`, 전체 scan 금지(`nextFireAt <= now` 인덱스 조회), Reminder별 IANA timezone(기본 `Asia/Seoul`, DB 비교는 UTC).
- 흐름: Reminder → ReminderDelivery → `UserNotificationService` → Notification → AFTER_COMMIT → `@Async` → PushSender → FCM (PR-A/B 그대로 재사용). 알림 타입 `NotificationType.REMINDER` 추가(enum 추가, STRING 저장이라 안전).

### 5.2 식사 종류(mealType) 규칙 — 시간대 추정 금지
- USER + MEAL: `mealType` 필수 (BREAKFAST/LUNCH/DINNER/SNACK)
- PLANNER + Planner `kind=MEAL`: `type=MEAL`, `mealType=null`, 문구 "식사 시간이에요"
- PLANNER + `kind=SNACK`: `type=MEAL`, `mealType=SNACK`, 문구 "간식 시간이에요"
- PLANNER + `kind=EXERCISE`: `type=EXERCISE`
- 검증은 factory에서 source별로 분리 (`Reminder.ofUser` / `Reminder.ofPlanner`).
- 이후 Planner가 `Event.mealType`을 제공하면 그 값을 그대로 동기화.

### 5.3 Planner 데이터에서 확인된 사실 (설계 근거)
1. Planner `Event.id`는 생성 때마다 `uuid4()`라서 **안정적이지 않다** → identity로 쓸 수 없다.
2. `Preferences`에는 사용자가 입력한 `breakfastTime/lunchTime/dinnerTime/exerciseTime`이 있으나 **이벤트와 명시적으로 연결되어 있지 않다** (이벤트는 사용자가 옮길 수 있음). 이벤트 시각↔선호 시각 매칭은 추정이라 PR-C에서 사용하지 않음. 후속 개선: Planner 생성기가 `Event`에 `mealType`을 같이 내려주기.
3. `PlannerService`는 테스트 4개가 생성자를 직접 호출한다: `PlannerExerciseContractTest`, `PlannerGeneratorContractTest`, `PlannerServiceApplyDietGoalTest`, `PlannerTest`. 이벤트 발행용 `ApplicationEventPublisher` 파라미터를 추가하면 이 호출부를 현재 시그니처에 맞춰 수정해야 한다 (호환 생성자 금지).
4. Planner는 `weekly_plans`에 주 단위(`week_start`)로 JSON payload를 저장하고 `PUT /api/planner`가 `PlannerService.save`를 호출한다. 이벤트는 구체 날짜/시각(`LocalDateTime start/end`).

### 5.4 identity와 주간 계획 upsert (핵심 설계)
- **sourceKey = `PLANNER:{KIND}:{ordinal}`**. ordinal은 하루 안에서 같은 kind 이벤트를 시작 시각순으로 정렬한 1-based 순번 (시각 값이 아니라 순서만 사용). 예: `PLANNER:MEAL:1`, `PLANNER:SNACK:1`, `PLANNER:EXERCISE:1`.
  - 한계: 어떤 날 식사를 하나 건너뛰면 그날 순번이 당겨져 사용자의 enabled/override가 붙는 슬롯이 달라질 수 있다. 발송 시각은 항상 실제 이벤트에서 가져오므로 시각은 틀리지 않는다.
  - 순번 상한: MEAL 6, SNACK 4, EXERCISE 2 (Planner 유래 Reminder 사용자당 최대 12개, 초과 무시+로그, USER 20개와 합산 안 함).
- **PLANNER Reminder는 반복 패턴이 아니라 "저장된 계획의 날짜별 슬롯"을 따른다.**
  - 새 테이블 `reminder_planner_slots(reminder_id, plan_date, planned_time)`, UNIQUE `(reminder_id, plan_date)`.
  - 주 W 계획을 저장하면 **그 주(월~일)의 슬롯만 전체 교체**. 다른 주는 그대로 → 다음 주 계획을 바꿔도 이번 주 알림은 영향 없음. 계획이 없는 주에는 알림이 없음(지난주 패턴이 몰래 반복되지 않음).
  - 현재 주보다 이전 주의 저장은 무시.
  - 계획 재저장 시 uuid가 전부 바뀌어도 slot identity가 순번이라 같은 Reminder에 그대로 붙음(멱등).
  - 순번이 사라지면 그 주 슬롯이 비고 미래 슬롯이 없으면 `nextFireAt=NULL`(휴면). Reminder(enabled, override)는 유지.
  - 새 순번은 Reminder 신규 생성(`enabled=true`).
  - 동시 저장은 기존 `users.findByIdForUpdate`로 직렬화, `(user_id, source_key)` 유니크로 생성 경쟁 방지(위반 시 1회 재시도).
- **요일마다 식사 시간이 다른 경우** (예: 월~수 12:00, 목·금 13:00): mode로 합치지 않는다. 같은 슬롯에 날짜별 시각이 각각 저장되므로 정확한 시각에 울리고 Reminder 수는 순번 수(≤12)에 머문다. (비교한 안: mode 합치기 ✗ 틀린 시각 / 시간별 분리 ✗ identity 불안정 / 슬롯×요일 행 ✗ 알림 수 폭증 / **슬롯+날짜별 시각 ✓**)
- **사용자 override**: PLANNER Reminder는 `timeOverride`(LocalTime, nullable) 하나만. 값이 있으면 계획된 날짜마다 그 시각에 울리고, null이면 계획 시각을 따름. 요일은 계획 날짜가 결정. `enabled`는 동기화가 건드리지 않음. (lead 방식 "N분 전"은 후속.)

### 5.5 데이터 모델
**`reminders`**: id, user(LAZY), type, mealType(nullable), label(≤50), timezone(IANA, 기본 Asia/Seoul), enabled, `nextFireAt`(UTC Instant), source(USER/PLANNER), sourceKey(nullable), createdAt/updatedAt
- USER 전용: `scheduledTime`(LocalTime), `daysOfWeek`(비트마스크 smallint)
- PLANNER 전용: `timeOverride`(LocalTime nullable)
- 불변식: 비활성이거나 다음 슬롯/요일이 없으면 `nextFireAt=NULL`

**`reminder_planner_slots`**: reminder_id(FK, ON DELETE CASCADE), plan_date, planned_time

**`reminder_deliveries`**: reminder_id(FK, ON DELETE CASCADE), scheduled_date(로컬), scheduled_time(로컬), status(`SENT/SKIPPED_MISSED/SKIPPED_SUSPENDED`), notification_id(nullable), created_at, **UNIQUE(reminder_id, scheduled_date, scheduled_time)**

**인덱스**: reminders `(next_fire_at)`, `(user_id)`, UNIQUE `(user_id, source_key)` / slots UNIQUE `(reminder_id, plan_date)`, `(plan_date)` / deliveries UNIQUE 3컬럼, `(scheduled_date)`.
`ddl-auto: update`는 partial index를 만들 수 없어 일반 인덱스로 시작. 운영 Postgres에서 `EXPLAIN`으로 수동 확인 절차 포함.

### 5.6 Scheduler / 처리 순서
- `@Scheduled(fixedDelay=60_000, initialDelay=30_000)`, 배치 100건, tick당 최대 10배치. 킬 스위치 `stevil.reminder.scheduler.enabled`(기본 true, env `STEVIL_REMINDER_SCHEDULER_ENABLED`).
- 조회: `@Lock(PESSIMISTIC_WRITE)` + `jakarta.persistence.lock.timeout=-2`(SKIP LOCKED), `where enabled = true and nextFireAt <= :now order by nextFireAt, id`.
- Reminder 1건당 독립 트랜잭션(`TransactionTemplate`):
  1. `ReminderDelivery` insert + flush (유니크 위반이면 이미 처리된 회차 → skip)
  2. 정지 계정이면 `SKIPPED_SUSPENDED`; 아니고 grace(10분) 초과면 `SKIPPED_MISSED`; 그 외 `SENT`
  3. `SENT`이면 `UserNotificationService.create(...)` (PR-A 이벤트 발행) 후 delivery에 notificationId 기록
  4. `nextFireAt = computeNext(now)` 로 전진
- Notification 생성 실패 시 delivery도 함께 롤백 → 다음 tick 재시도(grace 지나면 SKIPPED로 정리).
- 다음 발생 시각 계산(순수 함수): USER는 요일 마스크, PLANNER는 미래 슬롯 후보의 시각(`timeOverride ?: planned_time`)을 timezone으로 변환해 `now`보다 엄격히 뒤인 첫 시각.
- 알림 문구/링크: MEAL "…식사 시간이에요"(mealType별), EXERCISE "운동 시간이에요", INJECTION "주사 시간이에요"(용량 언급 없음), WEIGHT "체중을 기록할 시간이에요", HOSPITAL "병원 방문 알림". targetUrl: `/diet`, `/exercise`, `/diary`, `/hospitals`, `/weight` (모두 PR-A 내부 경로 검증 통과).
- 보관 정리 job(일 1회): delivery 60일 초과, planner slot 14일 초과 삭제.

### 5.7 API (`/api/reminders`, 인증 필수, userId는 항상 principal, 남의 것은 404)
| 메서드 | 경로 | 내용 |
|---|---|---|
| GET | `/api/reminders` | 목록. PLANNER는 `timeOverride`, 앞으로의 `plannedSlots`(최대 7일), `nextFireAt`(UTC) 포함 |
| POST | `/api/reminders` | **USER 생성만**. `{type, mealType?, scheduledTime:"HH:mm", daysOfWeek:[...], timezone?, label?, enabled?}`. HOSPITAL은 400 |
| PATCH | `/api/reminders/{id}` | USER: scheduledTime/daysOfWeek/timezone/label/mealType. PLANNER: `timeOverride`/label/timezone만(시간·요일 필드는 400). `timeOverride=null`이면 Planner를 다시 따름 |
| PATCH | `/api/reminders/{id}/enabled` | `{enabled}` (둘 다 가능) |
| DELETE | `/api/reminders/{id}` | USER 204, PLANNER 400 |
- 검증: MEAL(USER)은 mealType 필수, 요일 최소 1개, timezone IANA 검증, USER 20개 한도, 동일 Reminder 중복 409.
- `SecurityUrls.USER_URLS`에 `/api/reminders`, `/api/reminders/**` 추가.

### 5.8 테스트 계획
- 계산기 단위: 요일 마스크, timezone(Seoul/New_York), DST gap/overlap, 자정 롤오버, 마스크 0, "after보다 엄격히 큰 시각".
- grace 경계(정확히 10분 vs 10분 1초), scheduler(H2): 도래 시 Notification 1건+delivery 1행, 같은 tick 두 번 실행해도 1건, 유니크 직접 검증, 재시작 시뮬레이션(grace 안 catch-up / 밖 skip, 3일 미실행 후 최대 1건), 비활성 미발송, 켤 때·수정할 때 과거 회차 미발송, 한 건 실패가 나머지를 막지 않음, Notification 생성 실패 시 delivery 롤백, 정지 계정 `SKIPPED_SUSPENDED`.
- push 체인: Reminder → Notification → AFTER_COMMIT → 별도 스레드 PushSender(mock), 커밋 전 push 없음.
- 동기화: 같은 계획을 uuid만 바꿔 재저장해도 Reminder/슬롯 그대로, 다음 주 변경이 이번 주에 영향 없음, 과거 주 저장 무시, 월~수 12:00/목·금 13:00이 Reminder 1개·슬롯 5개로 정확한 시각, 순번 사라지면 휴면(enabled/timeOverride 유지), override가 재동기화 후에도 유지, 순번 상한, 동기화 실패가 Planner 저장을 깨지 않음, 저장 롤백 시 동기화 없음.
- 식사 종류: USER MEAL mealType 없으면 400, PLANNER MEAL은 mealType=null·문구 "식사 시간이에요", SNACK, HOSPITAL 생성 400, PLANNER DELETE 400.
- API: CRUD 검증, 소유자 격리 404, 한도 20, 중복 409, MockMvc 보안(미인증 3xx, 잘못된 JWT 401), 보관 정리.
- 전체 test는 base 대비 신규 실패 0건이어야 함.

### 5.9 예상 수정 파일
- 신규 `reminder` 패키지: `Reminder`, `ReminderPlannerSlot`, `ReminderDelivery`, enum(`ReminderType`, `MealType`, `ReminderSource`, `DeliveryStatus`), repository, `ReminderScheduleCalculator`, `ReminderService`, `ReminderSyncService`, `PlannerSlotMapper`, `ReminderDeliveryProcessor`, `ReminderNotificationTemplates`, `ReminderScheduler`, `ReminderSchedulingConfig`(`@EnableScheduling`), `ReminderProperties`, `ReminderController`, dto, `ReminderPlannerSyncListener`, cleanup job, 테스트 다수
- 수정: `PlannerService`(publisher 파라미터, `save`에서 `PlannerSavedEvent` 발행), 위 테스트 4개(생성자 인자만), `NotificationType`(REMINDER), `SecurityUrls`, `application.yaml`(`stevil.reminder.*`), `.env.example`
- 새 테이블 3개(`reminders`, `reminder_planner_slots`, `reminder_deliveries`), 기존 테이블 변경 없음.

### 5.10 구현 순서
1. PR-B 머지 후 최신 base로 `feature/reminder-scheduler` 브랜치 + 별도 worktree
2. enum/엔티티/계산기(USER·PLANNER) + 단위 테스트
3. USER 경로(CRUD, 검증, 컨트롤러, 보안 URL)
4. Delivery processor + scheduler(잠금, 유니크, grace, 정지 계정) + 통합 테스트
5. `REMINDER` 알림 문구/링크 + push 체인 테스트
6. `PlannerSavedEvent`, `PlannerSlotMapper`, `ReminderSyncService`, 리스너, `PlannerService` 수정(+테스트 4개)
7. 보관 정리 job, 전체 빌드/test base 비교, 로컬 커밋 후 보고 (승인 전 push 금지)

### 5.11 구현 시작 전에 사용자에게 확인받을 것 (제안값)
1. PLANNER Reminder는 지난주 패턴을 반복하지 않고 **저장된 계획의 날짜만** 따른다 (계획 없는 주에는 알림 없음) — 맞는지
2. 순번 상한 MEAL 6 / SNACK 4 / EXERCISE 2
3. override는 `timeOverride` 하나만 (N분 전 lead 방식은 후속)
4. 동기화 리스너 동기 실행(PUT 응답 지연 수 ms) vs `@Async`
5. 기존 사용자 backfill은 다음 Planner 저장 시점부터 (즉시 backfill 엔드포인트 없음)

---

## 6. Firebase / 운영 활성화 체크리스트 (사람이 해야 하는 일)

**아직 하지 않았고, 일치 확인 전에는 절대 `STEVIL_FIREBASE_ENABLED=true`로 바꾸지 않는다.**

1. Firebase Console에서 **service account가 속한 프로젝트 ID가 Stevil이 실제로 쓰는 Firebase(Hosting) 프로젝트와 같은지 확인**. (개발 PC 바탕화면에 FCM 전용 service account 키(JSON)를 발급해 둔 상태. 파일명/내용은 이 문서에 적지 않음.)
   - 다르면 SENDER_ID_MISMATCH / 인증 오류가 난다.
2. 해당 Google Cloud 프로젝트에 Firebase가 활성화되어 있고 **Firebase Cloud Messaging API**가 Enabled인지 확인.
3. IAM에서 해당 서비스 계정 역할이 **"Firebase Cloud Messaging API Admin"만** 있는지 확인 (기본 `firebase-adminsdk` 계정이 아닌 FCM 전용 계정을 쓰기로 함).
4. 키 파일을 EC2로 `scp` 후 배치:
   ```bash
   sudo install -d -m 755 /etc/stevil
   sudo install -m 600 -o root -g root ./<키파일>.json /etc/stevil/firebase-service-account.json
   sudo stat -c '%a %U %n' /etc/stevil/firebase-service-account.json   # 600 root ...
   ```
5. 로컬 사본은 안전하게 삭제. (바탕화면 위치는 상속 권한 때문에 다른 로컬 계정이 읽을 수 있음. 키 내용을 채팅/메일/저장소에 붙이지 말 것.)
6. 서버 `~/Stevil/.env` 에 **경로/토글만** 추가 (JSON 내용을 env에 넣지 않음):
   ```
   FIREBASE_SERVICE_ACCOUNT_FILE=/etc/stevil/firebase-service-account.json
   STEVIL_FIREBASE_ENABLED=true   # ← 1~3 확인 + PR-C/PR-D 배포 + 테스트 기기 smoke 이후에만
   ```
7. 재기동 후 확인: `docker exec stevil-backend ls -l /run/secrets/` (내용 `cat` 금지), 기동 로그에서 `FCM push: ENABLED (projectId=...)` 확인. `FAILED ... falling back to NoopPushSender` 가 보이면 설정 문제.
8. 실제 발송 검증은 PR-D(토큰 발급) 이후 테스트 기기 토큰으로. 알림 생성 경로는 PR-C(Reminder) 이후 가능.

운영 활성화 시점은 **PR-B → PR-C → PR-D 배포 후, 테스트 기기 smoke 확인 뒤**로 확정.

---

## 7. 이어서 시작하는 방법

```bash
git fetch --prune
git log --oneline -3 origin/local/design-preview        # PR-B(#31) 머지 여부 확인
```
- #31이 아직 오픈이면: 머지 여부를 사용자와 확정. **머지 전에는 PR-C 브랜치를 만들지 않는다** (base가 달라짐).
- 머지 후 PR-C 시작:
  ```bash
  git worktree add -b feature/reminder-scheduler ../stevil-reminder origin/local/design-preview
  git -C ../stevil-reminder branch --unset-upstream feature/reminder-scheduler   # 실수로 design-preview에 push 방지
  cd ../stevil-reminder/stevil-backend
  .\gradlew.bat compileJava compileTestJava
  ```
- 먼저 §5.11의 확인 항목을 사용자에게 받은 뒤 구현 시작.
- 검증 명령: `.\gradlew.bat compileJava compileTestJava` → 관련 테스트 → `.\gradlew.bat test` → `.\gradlew.bat bootJar`. 알려진 실패 2건(§3) 외 신규 실패가 없어야 한다.

## 8. 로컬 worktree 상태 (작업 PC 기준, 정리는 사용자 지시가 있을 때만)
- `C:\Users\human-01\Desktop\stevil` — 메인 worktree (`local/design-preview` 오래된 로컬 ref, 미추적 파일 있음, 건드리지 않음)
- `...\stevil-fcm` — PR-A 브랜치 `feature/fcm-notification-core` worktree (PR #30 머지됨, 현재 detached, 정리 대기)
- `...\stevil-fcm-delivery` — PR-B `feature/fcm-delivery` (PR #31)
- `...\stevil-handoff` — 이 문서용 `docs/fcm-handoff`

## 9. 남은 후속 항목 (다음 PR 후보)
- HOSPITAL 1회성 날짜 Reminder (scheduledDate / one-shot)
- Planner `Event.mealType` 제공 → Reminder subtype 동기화 (생성기 변경)
- PLANNER Reminder "N분 전" lead 방식 override
- FCM 재시도/outbox (일시 오류 재전송)
- 관리자 발송 API + `notification_broadcasts` (미착수, 필요 시)
- PR-D 프론트: Firebase Web SDK, service worker(`firebase-messaging-sw.js`), VAPID 키(프론트 전용), 토큰 등록/삭제(`POST/DELETE /api/notifications/token`), 알림 벨/목록/읽음 UI, Android·Desktop Chrome/Edge 우선(iOS는 제외)
- 알려진 기존 실패 2건의 원인 정리(별개 작업)
