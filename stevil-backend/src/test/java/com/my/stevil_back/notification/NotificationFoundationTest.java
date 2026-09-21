package com.my.stevil_back.notification;

import com.my.stevil_back.notification.dto.response.NotificationResponse;
import com.my.stevil_back.notification.entity.UserDevice;
import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
import com.my.stevil_back.notification.push.NotificationPushListener;
import com.my.stevil_back.notification.push.PushPayload;
import com.my.stevil_back.notification.push.PushSender;
import com.my.stevil_back.notification.push.TokenMasker;
import com.my.stevil_back.notification.repository.NotificationRepository;
import com.my.stevil_back.notification.repository.UserDeviceRepository;
import com.my.stevil_back.notification.service.UserDeviceService;
import com.my.stevil_back.notification.service.UserNotificationService;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/*
 * 알림/기기 도메인 통합 테스트 (H2 인메모리). 실제 커밋이 필요하므로 테스트 트랜잭션을 끄고 @AfterEach 로 정리한다.
 */
@DataJpaTest
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({UserDeviceService.class, UserNotificationService.class, NotificationPushListener.class})
class NotificationFoundationTest {

    @Autowired UserDeviceService devices;
    @Autowired UserNotificationService notifications;
    @Autowired UserDeviceRepository deviceRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired UserRepository userRepository;
    @Autowired PlatformTransactionManager txManager;
    @MockitoBean PushSender pushSender;

    Long a;
    Long b;

    @BeforeEach
    void users() {
        a = user("a@example.com");
        b = user("b@example.com");
    }

    @AfterEach
    void cleanup() {
        notificationRepository.deleteAll();
        deviceRepository.deleteAll();
        userRepository.deleteAll();
    }

    private Long user(String email) {
        return userRepository.save(User.builder().email(email).nickname(email).role(UserRole.ROLE_USER).build()).getId();
    }

    // ---------- UserDevice ----------

    @Test
    void registerAndReRegisterKeepsOneRow() {
        devices.register(a, "tok-1", DevicePlatform.WEB, "UA");
        devices.register(a, "tok-1", DevicePlatform.WEB, "UA2");

        assertThat(deviceRepository.countByUserId(a)).isEqualTo(1);
        assertThat(deviceRepository.findByFcmToken("tok-1").orElseThrow().getUserAgent()).isEqualTo("UA2");
    }

    @Test
    void sameTokenFromAnotherUserTransfersOwnership() {
        devices.register(a, "tok-1", DevicePlatform.WEB, null);
        devices.register(b, "tok-1", DevicePlatform.WEB, null);

        assertThat(deviceRepository.countByUserId(a)).isZero();
        assertThat(deviceRepository.countByUserId(b)).isEqualTo(1);
    }

    @Test
    void unregisterDeletesOwnTokenOnly() {
        devices.register(a, "tok-1", DevicePlatform.WEB, null);

        assertThat(devices.unregister(b, "tok-1")).isFalse();
        assertThat(deviceRepository.findByFcmToken("tok-1")).isPresent();

        assertThat(devices.unregister(a, "tok-1")).isTrue();
        assertThat(deviceRepository.findByFcmToken("tok-1")).isEmpty();
    }

    @Test
    void limitOfTenDropsOldestLastUsed() {
        for (int i = 1; i <= 10; i++) {
            devices.register(a, "tok-" + i, DevicePlatform.WEB, null);
            sleep();
        }
        // tok-1 을 갱신해 가장 오래된 기기를 tok-2 로 만든다.
        devices.register(a, "tok-1", DevicePlatform.WEB, null);
        sleep();
        devices.register(a, "tok-11", DevicePlatform.WEB, null);

        List<String> tokens = deviceRepository.findTokensByUserId(a);
        assertThat(tokens).hasSize(10).contains("tok-1", "tok-11").doesNotContain("tok-2");
    }

    @Test
    void concurrentRegistrationOfSameTokenLeavesOneRow() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = List.of(
                pool.submit(() -> { await(start); devices.register(a, "race", DevicePlatform.WEB, null); }),
                pool.submit(() -> { await(start); devices.register(b, "race", DevicePlatform.WEB, null); }));
        start.countDown();
        for (Future<?> f : futures) {
            f.get();
        }
        pool.shutdown();

        assertThat(deviceRepository.findAll().stream().filter(d -> d.getFcmToken().equals("race"))).hasSize(1);
    }

    @Test
    void duplicateTokenRejectedByUniqueConstraint() {
        devices.register(a, "dup", DevicePlatform.WEB, null);
        User user = userRepository.findById(a).orElseThrow();

        assertThatThrownBy(() -> deviceRepository.saveAndFlush(
                UserDevice.create(user, "dup", DevicePlatform.WEB, null, LocalDateTime.now())))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---------- Notification ----------

    @Test
    void createListOrderAndUnreadCount() {
        for (int i = 1; i <= 3; i++) {
            notifications.create(a, NotificationType.SYSTEM, "t" + i, "b", "/mypage");
        }
        notifications.create(b, NotificationType.SYSTEM, "other", "b", null);

        Page<NotificationResponse> page = notifications.list(a, false, 0, 2);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getContent()).extracting(NotificationResponse::title).containsExactly("t3", "t2");
        assertThat(notifications.list(a, false, 1, 2).getContent())
                .extracting(NotificationResponse::title).containsExactly("t1");
        assertThat(notifications.unreadCount(a)).isEqualTo(3);
    }

    @Test
    void readIsIdempotentAndUnreadOnlyFilters() {
        Long id1 = notifications.create(a, NotificationType.SYSTEM, "t1", "b", null).id();
        notifications.create(a, NotificationType.SYSTEM, "t2", "b", null);

        NotificationResponse first = notifications.markRead(a, id1);
        NotificationResponse second = notifications.markRead(a, id1);

        assertThat(first.read()).isTrue();
        // DB 가 마이크로초로 반올림하므로 첫 읽음 시각이 유지되는지만 허용 오차로 확인한다.
        assertThat(second.readAt()).isCloseTo(first.readAt(), org.assertj.core.api.Assertions.within(1, java.time.temporal.ChronoUnit.MILLIS));
        assertThat(notifications.unreadCount(a)).isEqualTo(1);
        assertThat(notifications.list(a, true, 0, 20).getContent())
                .extracting(NotificationResponse::title).containsExactly("t2");
    }

    @Test
    void readAllOnlyTouchesOwnNotifications() {
        notifications.create(a, NotificationType.SYSTEM, "t1", "b", null);
        notifications.create(a, NotificationType.SYSTEM, "t2", "b", null);
        notifications.create(b, NotificationType.SYSTEM, "t3", "b", null);

        assertThat(notifications.markAllRead(a)).isEqualTo(2);
        assertThat(notifications.markAllRead(a)).isZero();
        assertThat(notifications.unreadCount(a)).isZero();
        assertThat(notifications.unreadCount(b)).isEqualTo(1);
    }

    @Test
    void otherUsersNotificationIs404() {
        Long id = notifications.create(a, NotificationType.SYSTEM, "t", "b", null).id();

        assertThatThrownBy(() -> notifications.markRead(b, id))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        e -> assertThat(e.getStatusCode().value()).isEqualTo(404));
        assertThat(notifications.unreadCount(a)).isEqualTo(1);
    }

    @Test
    void targetUrlValidation() {
        for (String bad : new String[]{"https://evil.com", "//evil.com", "mypage", "/a\\b", "/a b", "javascript:alert(1)"}) {
            assertThatThrownBy(() -> notifications.create(a, NotificationType.SYSTEM, "t", "b", bad))
                    .as(bad).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(notifications.create(a, NotificationType.SYSTEM, "t", "b", null).targetUrl()).isNull();
        assertThat(notifications.create(a, NotificationType.SYSTEM, "t", "b", "/community/1").targetUrl())
                .isEqualTo("/community/1");
    }

    @Test
    void titleAndBodyLengthLimits() {
        assertThatThrownBy(() -> notifications.create(a, NotificationType.SYSTEM, "x".repeat(101), "b", null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> notifications.create(a, NotificationType.SYSTEM, "t", "x".repeat(501), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ---------- Transaction / event ----------

    @Test
    void pushHappensAfterCommitOnly() {
        devices.register(a, "tok-1", DevicePlatform.WEB, null);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            notifications.create(a, NotificationType.SYSTEM, "t", "b", "/x");
            verify(pushSender, never()).send(any());
        });

        ArgumentCaptor<PushPayload> captor = ArgumentCaptor.forClass(PushPayload.class);
        verify(pushSender).send(captor.capture());
        assertThat(captor.getValue().deviceTokens()).containsExactly("tok-1");
        assertThat(captor.getValue().title()).isEqualTo("t");
    }

    @Test
    void rollbackSendsNoPush() {
        devices.register(a, "tok-1", DevicePlatform.WEB, null);

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            notifications.create(a, NotificationType.SYSTEM, "t", "b", null);
            s.setRollbackOnly();
        });

        verify(pushSender, never()).send(any());
        assertThat(notificationRepository.count()).isZero();
    }

    @Test
    void pushFailureDoesNotRollBackNotification() {
        devices.register(a, "tok-1", DevicePlatform.WEB, null);
        doThrow(new IllegalStateException("fcm down")).when(pushSender).send(any());

        notifications.create(a, NotificationType.SYSTEM, "t", "b", null);

        assertThat(notificationRepository.count()).isEqualTo(1);
    }

    @Test
    void noDevicesMeansNoPush() {
        notifications.create(a, NotificationType.SYSTEM, "t", "b", null);

        verify(pushSender, never()).send(any());
    }

    @Test
    void tokenMasking() {
        assertThat(TokenMasker.mask(null)).isEqualTo("null");
        assertThat(TokenMasker.mask("short")).isEqualTo("***");
        assertThat(TokenMasker.mask("abcdefghijklmnopqrstuvwxyz")).isEqualTo("...uvwxyz");
    }

    private static void sleep() {
        try {
            Thread.sleep(15);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
