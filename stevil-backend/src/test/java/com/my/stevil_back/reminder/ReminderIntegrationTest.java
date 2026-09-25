package com.my.stevil_back.reminder;

import com.my.stevil_back.notification.entity.Notification;
import com.my.stevil_back.notification.entity.UserDevice;
import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
import com.my.stevil_back.notification.push.NotificationPushListener;
import com.my.stevil_back.notification.push.PushPayload;
import com.my.stevil_back.notification.push.PushSender;
import com.my.stevil_back.notification.repository.NotificationRepository;
import com.my.stevil_back.notification.repository.UserDeviceRepository;
import com.my.stevil_back.notification.service.UserNotificationService;
import com.my.stevil_back.planner.dto.Event;
import com.my.stevil_back.planner.event.PlannerSavedEvent;
import com.my.stevil_back.reminder.config.ReminderProperties;
import com.my.stevil_back.reminder.dto.ReminderRequests;
import com.my.stevil_back.reminder.dto.ReminderResponse;
import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.ReminderDelivery;
import com.my.stevil_back.reminder.entity.enumType.DeliveryStatus;
import com.my.stevil_back.reminder.entity.enumType.MealType;
import com.my.stevil_back.reminder.entity.enumType.ReminderSource;
import com.my.stevil_back.reminder.entity.enumType.ReminderType;
import com.my.stevil_back.reminder.repository.ReminderDeliveryRepository;
import com.my.stevil_back.reminder.repository.ReminderPlannerSlotRepository;
import com.my.stevil_back.reminder.repository.ReminderRepository;
import com.my.stevil_back.reminder.service.ReminderDeliveryProcessor;
import com.my.stevil_back.reminder.service.ReminderPlannerSyncListener;
import com.my.stevil_back.reminder.service.ReminderScheduleCalculator;
import com.my.stevil_back.reminder.service.ReminderScheduler;
import com.my.stevil_back.reminder.service.ReminderService;
import com.my.stevil_back.reminder.service.ReminderSyncService;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/*
 * 리마인더 도메인 통합 테스트(H2). 실제 커밋/AFTER_COMMIT 흐름이 필요하므로 테스트 트랜잭션을 끄고 @AfterEach 로 정리한다.
 * @EnableScheduling 을 올리지 않으므로 스케줄은 자동 실행되지 않고 runOnce(now) 로 직접 돌린다.
 * @EnableAsync 도 없으므로 push 리스너는 커밋 직후 같은 스레드에서 실행된다(비동기 경로는 PR-B 테스트가 검증).
 */
@DataJpaTest(properties = "stevil.reminder.scheduler.enabled=true")
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({
        ReminderIntegrationTest.Props.class,
        ReminderScheduleCalculator.class, ReminderDeliveryProcessor.class, ReminderScheduler.class,
        ReminderService.class, ReminderSyncService.class, ReminderPlannerSyncListener.class,
        UserNotificationService.class, NotificationPushListener.class
})
class ReminderIntegrationTest {

    @TestConfiguration
    @EnableConfigurationProperties(ReminderProperties.class)
    static class Props {
    }

    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    @Autowired ReminderService reminders;
    @Autowired ReminderScheduler scheduler;
    @Autowired ReminderSyncService sync;
    @Autowired ReminderRepository reminderRepository;
    @Autowired ReminderDeliveryRepository deliveryRepository;
    @Autowired ReminderPlannerSlotRepository slotRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired UserDeviceRepository deviceRepository;
    @Autowired UserRepository userRepository;
    @Autowired ApplicationEventPublisher publisher;
    @Autowired PlatformTransactionManager txManager;
    @MockitoBean PushSender pushSender;
    @MockitoSpyBean UserNotificationService notificationService;
    @MockitoSpyBean ReminderScheduleCalculator calculator;
    @MockitoSpyBean ReminderSyncService syncSpy;

    Long a;
    Long b;

    @BeforeEach
    void users() {
        a = user("a@example.com");
        b = user("b@example.com");
    }

    @AfterEach
    void cleanup() {
        deliveryRepository.deleteAll();
        slotRepository.deleteAll();
        reminderRepository.deleteAll();
        notificationRepository.deleteAll();
        deviceRepository.deleteAll();
        userRepository.deleteAll();
    }

    private Long user(String email) {
        return userRepository.save(User.builder().email(email).nickname(email).role(UserRole.ROLE_USER).build()).getId();
    }

    private ReminderRequests.Create everyDay(ReminderType type, MealType mealType, LocalTime time) {
        return new ReminderRequests.Create(type, mealType, time, List.of(DayOfWeek.values()), null, null, null);
    }

    /** 도래 시각을 테스트가 정한 값으로 맞춘다(실제 계산 결과는 "지금 이후"라 바로 발송되지 않는다). */
    private Instant forceDue(Long reminderId, Instant fireAt) {
        new TransactionTemplate(txManager).executeWithoutResult(tx -> {
            Reminder r = reminderRepository.findById(reminderId).orElseThrow();
            r.scheduleNext(fireAt);
        });
        return fireAt;
    }

    private Reminder reload(Long id) {
        return reminderRepository.findById(id).orElseThrow();
    }

    // ---------- scheduler / delivery ----------

    @Test
    void dueReminderCreatesOneNotificationAndPushesAfterCommit() {
        deviceRepository.save(UserDevice.create(userRepository.findById(a).orElseThrow(), "tok-a", DevicePlatform.WEB, null, LocalDateTime.now()));
        Long id = reminders.create(a, everyDay(ReminderType.MEAL, MealType.LUNCH, LocalTime.of(12, 0))).id();
        Instant fireAt = forceDue(id, Instant.parse("2026-09-28T03:00:00Z")); // 서울 12:00
        Instant now = fireAt.plusSeconds(30);

        scheduler.runOnce(now);
        scheduler.runOnce(now); // 같은 tick 을 다시 돌려도 중복 없음

        List<Notification> sent = notificationRepository.findAll();
        assertThat(sent).hasSize(1);
        assertThat(sent.get(0).getType()).isEqualTo(NotificationType.REMINDER);
        assertThat(sent.get(0).getTitle()).isEqualTo("점심 식사 시간이에요");
        assertThat(sent.get(0).getTargetUrl()).isEqualTo("/diet");

        List<ReminderDelivery> deliveries = deliveryRepository.findByReminderId(id);
        assertThat(deliveries).hasSize(1);
        assertThat(deliveries.get(0).getStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(deliveries.get(0).getNotificationId()).isEqualTo(sent.get(0).getId());
        assertThat(deliveries.get(0).getScheduledTime()).isEqualTo(LocalTime.of(12, 0));
        assertThat(reload(id).getNextFireAt()).isEqualTo(Instant.parse("2026-09-29T03:00:00Z"));

        ArgumentCaptor<PushPayload> payload = ArgumentCaptor.forClass(PushPayload.class);
        verify(pushSender).send(payload.capture());
        assertThat(payload.getValue().deviceTokens()).containsExactly("tok-a");
        assertThat(payload.getValue().notificationId()).isEqualTo(sent.get(0).getId());
    }

    @Test
    void graceBoundaryIsInclusiveTenMinutes() {
        Long onTime = reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        Long late = reminders.create(b, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        Instant fireAt = Instant.parse("2026-09-27T23:00:00Z");
        forceDue(onTime, fireAt);
        forceDue(late, fireAt.minusSeconds(1));

        scheduler.runOnce(fireAt.plus(Duration.ofMinutes(10)));

        assertThat(deliveryRepository.findByReminderId(onTime).get(0).getStatus()).isEqualTo(DeliveryStatus.SENT);
        assertThat(deliveryRepository.findByReminderId(late).get(0).getStatus()).isEqualTo(DeliveryStatus.SKIPPED_MISSED);
        assertThat(notificationRepository.count()).isEqualTo(1);
    }

    @Test
    void longDowntimeRecordsAtMostOneSkippedOccurrenceAndMovesToFuture() {
        Long id = reminders.create(a, everyDay(ReminderType.INJECTION, null, LocalTime.of(9, 0))).id();
        Instant fireAt = forceDue(id, Instant.parse("2026-09-25T00:00:00Z"));
        Instant now = fireAt.plus(Duration.ofDays(3));

        scheduler.runOnce(now);

        assertThat(deliveryRepository.findByReminderId(id)).hasSize(1)
                .allMatch(d -> d.getStatus() == DeliveryStatus.SKIPPED_MISSED);
        assertThat(notificationRepository.count()).isZero();
        assertThat(reload(id).getNextFireAt()).isAfter(now);
    }

    @Test
    void suspendedUserGetsNoNotificationButScheduleAdvances() {
        Long id = reminders.create(a, everyDay(ReminderType.EXERCISE, null, LocalTime.of(19, 0))).id();
        new TransactionTemplate(txManager).executeWithoutResult(tx ->
                userRepository.findById(a).orElseThrow().suspend("test"));
        Instant fireAt = forceDue(id, Instant.parse("2026-09-28T10:00:00Z"));

        scheduler.runOnce(fireAt);

        assertThat(deliveryRepository.findByReminderId(id).get(0).getStatus()).isEqualTo(DeliveryStatus.SKIPPED_SUSPENDED);
        assertThat(notificationRepository.count()).isZero();
        verify(pushSender, never()).send(any());
        assertThat(reload(id).getNextFireAt()).isAfter(fireAt);
    }

    @Test
    void disabledReminderIsNeverDueAndReEnablingSkipsPastOccurrences() {
        Long id = reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        reminders.setEnabled(a, id, false);
        assertThat(reload(id).getNextFireAt()).isNull();

        scheduler.runOnce(Instant.now().plus(Duration.ofDays(2)));
        assertThat(deliveryRepository.count()).isZero();

        Instant beforeEnable = Instant.now();
        reminders.setEnabled(a, id, true);
        assertThat(reload(id).getNextFireAt()).isAfter(beforeEnable);
    }

    @Test
    void notificationFailureRollsBackDeliveryAndOtherRemindersStillRun() {
        Long ok = reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        Long broken = reminders.create(b, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        Instant fireAt = Instant.parse("2026-09-27T23:00:00Z");
        forceDue(ok, fireAt);
        forceDue(broken, fireAt);
        doThrow(new IllegalStateException("db down"))
                .when(notificationService).create(eq(b), any(), any(), any(), any());

        scheduler.runOnce(fireAt.plusSeconds(10));

        assertThat(deliveryRepository.findByReminderId(ok)).hasSize(1);
        assertThat(deliveryRepository.findByReminderId(broken)).isEmpty(); // delivery 도 같이 롤백
        assertThat(reload(broken).getNextFireAt()).isEqualTo(fireAt);      // 다음 tick 에 재시도
        assertThat(notificationRepository.count()).isEqualTo(1);
    }

    @Test
    void pushFailureAfterCommitDoesNotLoseNotification() {
        deviceRepository.save(UserDevice.create(userRepository.findById(a).orElseThrow(), "tok-a", DevicePlatform.WEB, null, LocalDateTime.now()));
        Long id = reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        Instant fireAt = forceDue(id, Instant.parse("2026-09-27T23:00:00Z"));
        doThrow(new RuntimeException("fcm down")).when(pushSender).send(any());

        scheduler.runOnce(fireAt);

        assertThat(notificationRepository.count()).isEqualTo(1);
        assertThat(deliveryRepository.findByReminderId(id).get(0).getStatus()).isEqualTo(DeliveryStatus.SENT);
    }

    @Test
    void failingHeadOfQueueDoesNotStarveLaterReminders() {
        User userA = userRepository.findById(a).orElseThrow();
        Instant early = Instant.parse("2026-09-27T23:00:00Z");
        for (int i = 0; i < 100; i++) {
            Reminder r = Reminder.ofUser(userA, ReminderType.WEIGHT, null, LocalTime.of(8, 0), 0x7F, "Asia/Seoul", null, true);
            r.scheduleNext(early);
            reminderRepository.save(r);
        }
        Long healthy = reminders.create(b, everyDay(ReminderType.WEIGHT, null, LocalTime.of(8, 0))).id();
        forceDue(healthy, early.plusSeconds(1));
        doThrow(new IllegalStateException("db down"))
                .when(notificationService).create(eq(a), any(), any(), any(), any());

        scheduler.runOnce(early.plusSeconds(30));

        assertThat(deliveryRepository.findByReminderId(healthy)).hasSize(1);
    }

    // ---------- USER API rules ----------

    @Test
    void userReminderValidation() {
        assertThatThrownBy(() -> reminders.create(a, everyDay(ReminderType.MEAL, null, LocalTime.NOON)))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("400");
        assertThatThrownBy(() -> reminders.create(a, everyDay(ReminderType.HOSPITAL, null, LocalTime.NOON)))
                .hasMessageContaining("400");
        assertThatThrownBy(() -> reminders.create(a, new ReminderRequests.Create(
                ReminderType.WEIGHT, null, LocalTime.NOON, List.of(), null, null, null)))
                .hasMessageContaining("400");
        assertThatThrownBy(() -> reminders.create(a, new ReminderRequests.Create(
                ReminderType.WEIGHT, null, LocalTime.NOON, List.of(DayOfWeek.MONDAY), "+09:00", null, null)))
                .hasMessageContaining("400");

        reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.NOON));
        assertThatThrownBy(() -> reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.NOON)))
                .hasMessageContaining("409");
    }

    @Test
    void userLimitIsTwentyAndOtherUsersReminderIs404() {
        for (int i = 0; i < ReminderService.USER_REMINDER_LIMIT; i++) {
            reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.of(0, i)));
        }
        assertThatThrownBy(() -> reminders.create(a, everyDay(ReminderType.WEIGHT, null, LocalTime.of(1, 0))))
                .hasMessageContaining("400");

        Long mine = reminderRepository.findByUserIdAndSource(a, ReminderSource.USER).get(0).getId();
        assertThatThrownBy(() -> reminders.delete(b, mine)).hasMessageContaining("404");
        reminders.delete(a, mine);
        assertThat(reminderRepository.findById(mine)).isEmpty();
    }

    // ---------- Planner sync ----------

    private static LocalDate nextMonday() {
        return LocalDate.now(SEOUL).with(DayOfWeek.MONDAY).plusWeeks(1);
    }

    private static Event event(String kind, LocalDate date, LocalTime time) {
        LocalDateTime start = date.atTime(time);
        return new Event(UUID.randomUUID().toString(), kind, kind, "", start, start.plusMinutes(30), "", false);
    }

    /** 월~수 12:00, 목·금 13:00 점심 + 매일 08:00 아침 */
    private static List<Event> weekWithDifferentLunchTimes(LocalDate monday) {
        List<Event> events = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            LocalDate day = monday.plusDays(i);
            events.add(event("MEAL", day, LocalTime.of(8, 0)));
            events.add(event("MEAL", day, i < 3 ? LocalTime.of(12, 0) : LocalTime.of(13, 0)));
        }
        return events;
    }

    private Reminder plannerReminder(String key) {
        return reminderRepository.findByUserIdAndSource(a, ReminderSource.PLANNER).stream()
                .filter(r -> r.getSourceKey().equals(key)).findFirst().orElseThrow();
    }

    @Test
    void differentTimesPerWeekdayKeepOneReminderWithPerDateSlots() {
        LocalDate monday = nextMonday();
        sync.sync(a, monday, weekWithDifferentLunchTimes(monday));

        assertThat(reminderRepository.findByUserIdAndSource(a, ReminderSource.PLANNER)).hasSize(2);
        Reminder lunch = plannerReminder("PLANNER:MEAL:2");
        assertThat(lunch.getType()).isEqualTo(ReminderType.MEAL);
        assertThat(lunch.getMealType()).isNull(); // 시간대로 식사 종류를 추정하지 않는다
        assertThat(slotRepository.findFrom(lunch.getId(), monday))
                .extracting(s -> s.getPlanDate().getDayOfWeek() + "@" + s.getPlannedTime())
                .containsExactly("MONDAY@12:00", "TUESDAY@12:00", "WEDNESDAY@12:00", "THURSDAY@13:00", "FRIDAY@13:00");
        assertThat(lunch.getNextFireAt()).isEqualTo(monday.atTime(12, 0).atZone(SEOUL).toInstant());
    }

    @Test
    void resyncWithNewUuidsIsIdempotentAndKeepsUserChoices() {
        LocalDate monday = nextMonday();
        sync.sync(a, monday, weekWithDifferentLunchTimes(monday));
        Reminder lunch = plannerReminder("PLANNER:MEAL:2");
        reminders.update(a, lunch.getId(), new ReminderRequests.Update(null, null, null, null, null, null, LocalTime.of(11, 30)));
        Long breakfast = plannerReminder("PLANNER:MEAL:1").getId();
        reminders.setEnabled(a, breakfast, false);

        sync.sync(a, monday, weekWithDifferentLunchTimes(monday)); // Event.id 는 전부 새 uuid

        assertThat(reminderRepository.findByUserIdAndSource(a, ReminderSource.PLANNER)).hasSize(2);
        Reminder again = plannerReminder("PLANNER:MEAL:2");
        assertThat(again.getId()).isEqualTo(lunch.getId());
        assertThat(again.getTimeOverride()).isEqualTo(LocalTime.of(11, 30));
        assertThat(again.getNextFireAt()).isEqualTo(monday.atTime(11, 30).atZone(SEOUL).toInstant());
        assertThat(slotRepository.findFrom(again.getId(), monday)).hasSize(5);
        assertThat(reload(breakfast).isEnabled()).isFalse();
        assertThat(reload(breakfast).getNextFireAt()).isNull();
    }

    @Test
    void savingOneWeekDoesNotTouchOtherWeeksAndPastWeeksAreIgnored() {
        LocalDate week1 = nextMonday();
        LocalDate week2 = week1.plusWeeks(1);
        sync.sync(a, week1, List.of(event("EXERCISE", week1, LocalTime.of(19, 0))));
        sync.sync(a, week2, List.of(event("EXERCISE", week2, LocalTime.of(20, 0))));
        sync.sync(a, week2, List.of()); // 다음 주를 비워도

        Reminder exercise = plannerReminder("PLANNER:EXERCISE:1");
        assertThat(slotRepository.findFrom(exercise.getId(), week1))
                .extracting(s -> s.getPlanDate()).containsExactly(week1); // 이번 주는 그대로

        LocalDate lastWeek = LocalDate.now(SEOUL).with(DayOfWeek.MONDAY).minusWeeks(1);
        sync.sync(a, lastWeek, List.of(event("SNACK", lastWeek, LocalTime.of(15, 0))));
        assertThat(reminderRepository.findByUserIdAndSource(a, ReminderSource.PLANNER)).hasSize(1);
    }

    @Test
    void vanishedOrdinalGoesDormantAndPlannerReminderCannotBeDeleted() {
        LocalDate monday = nextMonday();
        sync.sync(a, monday, List.of(event("SNACK", monday, LocalTime.of(15, 0))));
        Reminder snack = plannerReminder("PLANNER:SNACK:1");
        assertThat(snack.getType()).isEqualTo(ReminderType.MEAL);
        assertThat(snack.getMealType()).isEqualTo(MealType.SNACK);

        sync.sync(a, monday, List.of());

        Reminder dormant = reload(snack.getId());
        assertThat(dormant.isEnabled()).isTrue();
        assertThat(dormant.getNextFireAt()).isNull();
        assertThatThrownBy(() -> reminders.delete(a, snack.getId())).hasMessageContaining("400");
        assertThatThrownBy(() -> reminders.update(a, snack.getId(),
                new ReminderRequests.Update(null, null, LocalTime.NOON, null, null, null, null)))
                .hasMessageContaining("400");
    }

    @Test
    void ordinalLimitsCapPlannerReminders() {
        LocalDate monday = nextMonday();
        List<Event> events = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            events.add(event("MEAL", monday, LocalTime.of(6 + i, 0)));
            events.add(event("EXERCISE", monday, LocalTime.of(6 + i, 30)));
        }
        sync.sync(a, monday, events);

        List<Reminder> planner = reminderRepository.findByUserIdAndSource(a, ReminderSource.PLANNER);
        assertThat(planner).extracting(Reminder::getSourceKey).containsExactlyInAnyOrder(
                "PLANNER:MEAL:1", "PLANNER:MEAL:2", "PLANNER:MEAL:3", "PLANNER:MEAL:4", "PLANNER:MEAL:5", "PLANNER:MEAL:6",
                "PLANNER:EXERCISE:1", "PLANNER:EXERCISE:2");
    }

    @Test
    void plannerEventSyncsOnlyAfterCommit() {
        LocalDate monday = nextMonday();
        TransactionTemplate tx = new TransactionTemplate(txManager);

        tx.executeWithoutResult(status -> {
            publisher.publishEvent(new PlannerSavedEvent(a, monday, List.of(event("MEAL", monday, LocalTime.NOON))));
            status.setRollbackOnly();
        });
        assertThat(reminderRepository.count()).isZero();

        tx.executeWithoutResult(status ->
                publisher.publishEvent(new PlannerSavedEvent(a, monday, List.of(event("MEAL", monday, LocalTime.NOON)))));
        assertThat(reminderRepository.findByUserIdAndSource(a, ReminderSource.PLANNER)).hasSize(1);
    }

    @Test
    void plannerReminderFiresAtPlannedTimeThroughScheduler() {
        LocalDate monday = nextMonday();
        sync.sync(a, monday, List.of(event("MEAL", monday, LocalTime.of(12, 0))));
        Reminder meal = plannerReminder("PLANNER:MEAL:1");
        Instant fireAt = monday.atTime(12, 0).atZone(SEOUL).toInstant();

        scheduler.runOnce(fireAt.plusSeconds(5));

        Notification sent = notificationRepository.findAll().get(0);
        assertThat(sent.getTitle()).isEqualTo("식사 시간이에요");
        assertThat(reload(meal.getId()).getNextFireAt()).isNull(); // 계획에 다음 슬롯이 없으면 휴면
        List<ReminderResponse> listed = reminders.list(a);
        assertThat(listed).hasSize(1);
    }

    @Test
    void syncFailureNeverBreaksThePlannerSave() {
        LocalDate monday = nextMonday();
        doThrow(new IllegalStateException("sync down")).when(syncSpy).sync(any(), any(), any());

        // 예외가 AFTER_COMMIT 에서 호출자(Planner PUT)로 올라오지 않아야 한다.
        new TransactionTemplate(txManager).executeWithoutResult(status ->
                publisher.publishEvent(new PlannerSavedEvent(a, monday, List.of(event("MEAL", monday, LocalTime.NOON)))));

        verify(syncSpy).sync(any(), any(), any());
        assertThat(reminderRepository.count()).isZero();
    }

    // ---------- concurrency: user change vs Planner sync ----------

    @Test
    void disablingDuringConcurrentSyncIsNotLost() throws Exception {
        Reminder after = userChangeDuringSync(id -> reminders.setEnabled(a, id, false));
        assertThat(after.isEnabled()).isFalse();
        assertThat(after.getNextFireAt()).isNull();
    }

    @Test
    void timeOverrideDuringConcurrentSyncIsNotLost() throws Exception {
        Reminder after = userChangeDuringSync(id -> reminders.update(a, id,
                new ReminderRequests.Update(null, null, null, null, null, null, LocalTime.of(11, 0))));
        assertThat(after.getTimeOverride()).isEqualTo(LocalTime.of(11, 0));
        assertThat(after.getNextFireAt()).isEqualTo(nextMonday().atTime(11, 0).atZone(SEOUL).toInstant());
    }

    /*
     * 동기화가 PLANNER 리마인더를 읽은 직후(계산 단계)에 멈춰 있는 동안 사용자 변경을 실행한다.
     * Reminder 행 잠금이 없으면 사용자 변경이 먼저 커밋되고, 뒤이어 동기화가 오래된 엔티티를 flush 해 변경을 덮어쓴다.
     */
    private Reminder userChangeDuringSync(Consumer<Long> userChange) throws Exception {
        LocalDate monday = nextMonday();
        sync.sync(a, monday, List.of(event("MEAL", monday, LocalTime.NOON)));
        // 동시 동기화는 시각을 바꿔 실제로 UPDATE 가 나가게 한다(변경이 없으면 dirty checking 이 flush 하지 않는다).
        List<Event> moved = List.of(event("MEAL", monday, LocalTime.of(12, 30)));
        Long id = plannerReminder("PLANNER:MEAL:1").getId();

        AtomicReference<Thread> syncThread = new AtomicReference<>();
        CountDownLatch syncHoldsRows = new CountDownLatch(1);
        doAnswer(invocation -> {
            if (Thread.currentThread() == syncThread.get()) {
                syncHoldsRows.countDown();
                Thread.sleep(300); // H2 기본 lock timeout(1s)보다 짧게
            }
            return invocation.callRealMethod();
        }).when(calculator).next(any(), any());

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> syncing = pool.submit(() -> {
                syncThread.set(Thread.currentThread());
                sync.sync(a, monday, moved);
            });
            assertThat(syncHoldsRows.await(5, TimeUnit.SECONDS)).isTrue();
            Future<?> changing = pool.submit(() -> userChange.accept(id));

            syncing.get(10, TimeUnit.SECONDS);
            changing.get(10, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }
        return reload(id);
    }
}
