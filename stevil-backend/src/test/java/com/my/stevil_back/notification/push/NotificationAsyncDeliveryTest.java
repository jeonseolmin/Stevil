package com.my.stevil_back.notification.push;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.my.stevil_back.notification.config.NotificationAsyncConfig;
import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
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
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/*
 * 알림 저장 → AFTER_COMMIT → 전용 executor(별도 스레드) → PushSender 흐름을 실제 스프링 컨텍스트(H2)에서 검증한다.
 * 실제 커밋이 필요하므로 테스트 트랜잭션을 끄고 @AfterEach 로 정리한다.
 */
@DataJpaTest
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({NotificationAsyncConfig.class, NotificationPushListener.class,
        UserDeviceService.class, UserNotificationService.class})
class NotificationAsyncDeliveryTest {

    @Autowired UserDeviceService devices;
    @Autowired UserNotificationService notifications;
    @Autowired UserDeviceRepository deviceRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired UserRepository userRepository;
    @Autowired PlatformTransactionManager txManager;
    @Autowired @Qualifier(NotificationAsyncConfig.PUSH_EXECUTOR) ThreadPoolTaskExecutor executor;
    @MockitoBean PushSender pushSender;

    Long userId;
    final CountDownLatch release = new CountDownLatch(1);

    @BeforeEach
    void user() {
        userId = userRepository.save(User.builder().email("a@example.com").nickname("a").role(UserRole.ROLE_USER).build()).getId();
    }

    @AfterEach
    void cleanup() {
        release.countDown();
        executor.getThreadPoolExecutor().getQueue().clear();
        await().atMost(Duration.ofSeconds(5)).until(() -> executor.getActiveCount() == 0);
        notificationRepository.deleteAll();
        deviceRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void pushRunsAfterCommitOnAnotherThread() {
        devices.register(userId, "tok-1", DevicePlatform.WEB, null);
        AtomicReference<String> pushThread = new AtomicReference<>();
        doAnswer(inv -> {
            pushThread.set(Thread.currentThread().getName());
            return null;
        }).when(pushSender).send(any());

        String requestThread = Thread.currentThread().getName();

        new TransactionTemplate(txManager).executeWithoutResult(status -> {
            notifications.create(userId, NotificationType.SYSTEM, "t", "b", null);
            verify(pushSender, never()).send(any());
        });

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> verify(pushSender).send(any()));
        assertThat(pushThread.get()).startsWith("notification-push-").isNotEqualTo(requestThread);
        assertThat(notificationRepository.count()).isEqualTo(1);
    }

    @Test
    void suspendedUserGetsNotificationButNoPushAndKeepsTokens() {
        devices.register(userId, "tok-1", DevicePlatform.WEB, null);
        User user = userRepository.findById(userId).orElseThrow();
        user.suspend("test");
        userRepository.save(user);

        notifications.create(userId, NotificationType.SYSTEM, "t", "b", null);

        verify(pushSender, after(700).never()).send(any());
        assertThat(notificationRepository.count()).isEqualTo(1);
        assertThat(deviceRepository.countByUserId(userId)).isEqualTo(1);
    }

    @Test
    void resumedUserReceivesPushAgain() {
        devices.register(userId, "tok-1", DevicePlatform.WEB, null);
        User user = userRepository.findById(userId).orElseThrow();
        user.suspend("test");
        userRepository.save(user);
        user.releaseSuspension();
        userRepository.save(user);

        notifications.create(userId, NotificationType.SYSTEM, "t", "b", null);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> verify(pushSender).send(any()));
    }

    @Test
    void queueOverflowDoesNotBreakTheRequestOrTheDatabase() {
        devices.register(userId, "tok-1", DevicePlatform.WEB, null);

        ListAppender<ILoggingEvent> logs = new ListAppender<>();
        logs.start();
        Logger configLogger = (Logger) LoggerFactory.getLogger(NotificationAsyncConfig.class);
        configLogger.addAppender(logs);

        try {
            Runnable blocker = () -> {
                try {
                    release.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            };

            // core(2) 스레드를 막고, 큐(500)를 채운 뒤, max(4) 까지 스레드를 늘려 풀을 완전히 포화시킨다.
            executor.execute(blocker);
            executor.execute(blocker);
            for (int i = 0; i < NotificationAsyncConfig_QUEUE(); i++) {
                executor.execute(() -> { });
            }
            executor.execute(blocker);
            executor.execute(blocker);
            assertThat(executor.getThreadPoolExecutor().getQueue().remainingCapacity()).isZero();
            assertThat(executor.getThreadPoolExecutor().getPoolSize()).isEqualTo(4);

            assertThatCode(() -> notifications.create(userId, NotificationType.SYSTEM, "t", "b", null))
                    .doesNotThrowAnyException();

            assertThat(notificationRepository.count()).isEqualTo(1);
            assertThat(logs.list).anySatisfy(e -> {
                assertThat(e.getLevel()).isEqualTo(Level.WARN);
                assertThat(e.getFormattedMessage()).contains("Push queue full");
            });
        } finally {
            configLogger.detachAppender(logs);
        }

        release.countDown();
        verify(pushSender, after(500).never()).send(any());
    }

    private static int NotificationAsyncConfig_QUEUE() {
        return (int) ReflectionTestUtils.getField(NotificationAsyncConfig.class, "QUEUE_CAPACITY");
    }
}
