package com.my.stevil_back.notification.push;

import com.google.firebase.ErrorCode;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.SendResponse;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/*
 * 종단 흐름: 알림 저장 → AFTER_COMMIT → 전용 executor → 실제 FcmPushService → (mock) FirebaseMessaging → 무효 토큰 정리.
 * Firebase 네트워크 호출은 없고, 실제 커밋이 필요하므로 테스트 트랜잭션은 끈다.
 */
@DataJpaTest
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@Import({NotificationAsyncConfig.class, NotificationPushListener.class, UserDeviceService.class,
        UserNotificationService.class, NotificationFcmEndToEndTest.FcmWiring.class})
class NotificationFcmEndToEndTest {

    @Autowired UserDeviceService devices;
    @Autowired UserNotificationService notifications;
    @Autowired UserDeviceRepository deviceRepository;
    @Autowired NotificationRepository notificationRepository;
    @Autowired UserRepository userRepository;
    @Autowired FirebaseMessaging messaging;

    Long userId;

    @BeforeEach
    void user() {
        reset(messaging);
        userId = userRepository.save(User.builder().email("a@example.com").nickname("a").role(UserRole.ROLE_USER).build()).getId();
    }

    @AfterEach
    void cleanup() throws Exception {
        Thread.sleep(200); // 진행 중인 비동기 작업이 삭제된 행을 건드리지 않도록 잠시 대기
        notificationRepository.deleteAll();
        deviceRepository.deleteAll();
        userRepository.deleteAll();
    }

    /** "dead" 로 시작하는 토큰만 지정한 오류로 실패시킨다. mock 은 호출 시점(answer 안)에서 만든다. */
    private void firebaseAnswers(MessagingErrorCode deadCode, ErrorCode deadHttpCode) throws Exception {
        when(messaging.sendEachForMulticast(any(MulticastMessage.class))).thenAnswer(inv -> {
            MulticastMessage message = inv.getArgument(0);
            List<String> tokens = (List<String>) ReflectionTestUtils.getField(message, "fids");
            List<SendResponse> responses = new ArrayList<>();
            for (String token : tokens) {
                responses.add(token.startsWith("dead")
                        ? FcmPushServiceTest.fail(deadCode, deadHttpCode) : FcmPushServiceTest.ok());
            }
            return FcmPushServiceTest.batch(responses.toArray(new SendResponse[0]));
        });
    }

    @Test
    void unregisteredTokenIsRemovedWhileNotificationAndOtherTokensRemain() throws Exception {
        firebaseAnswers(MessagingErrorCode.UNREGISTERED, ErrorCode.NOT_FOUND);
        devices.register(userId, "good-token", DevicePlatform.WEB, null);
        devices.register(userId, "dead-token", DevicePlatform.WEB, null);

        notifications.create(userId, NotificationType.SYSTEM, "t", "b", "/mypage");

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(deviceRepository.findTokensByUserId(userId)).containsExactly("good-token"));
        assertThat(notificationRepository.count()).isEqualTo(1);
    }

    @Test
    void senderIdMismatchTokenIsRemoved() throws Exception {
        firebaseAnswers(MessagingErrorCode.SENDER_ID_MISMATCH, ErrorCode.PERMISSION_DENIED);
        devices.register(userId, "good-token", DevicePlatform.WEB, null);
        devices.register(userId, "dead-token", DevicePlatform.WEB, null);

        notifications.create(userId, NotificationType.SYSTEM, "t", "b", null);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                assertThat(deviceRepository.findTokensByUserId(userId)).containsExactly("good-token"));
    }

    @Test
    void invalidArgumentKeepsAllTokens() throws Exception {
        firebaseAnswers(MessagingErrorCode.INVALID_ARGUMENT, ErrorCode.INVALID_ARGUMENT);
        devices.register(userId, "good-token", DevicePlatform.WEB, null);
        devices.register(userId, "dead-token", DevicePlatform.WEB, null);

        notifications.create(userId, NotificationType.SYSTEM, "t", "b", null);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                verify(messaging).sendEachForMulticast(any(MulticastMessage.class)));
        Thread.sleep(300); // 삭제가 (잘못) 일어날 시간을 준다
        assertThat(deviceRepository.findTokensByUserId(userId)).containsExactlyInAnyOrder("good-token", "dead-token");
        assertThat(notificationRepository.count()).isEqualTo(1);
    }

    @Test
    void transientFailureKeepsAllTokens() throws Exception {
        firebaseAnswers(MessagingErrorCode.UNAVAILABLE, ErrorCode.UNAVAILABLE);
        devices.register(userId, "good-token", DevicePlatform.WEB, null);
        devices.register(userId, "dead-token", DevicePlatform.WEB, null);

        notifications.create(userId, NotificationType.SYSTEM, "t", "b", null);

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                verify(messaging).sendEachForMulticast(any(MulticastMessage.class)));
        Thread.sleep(300);
        assertThat(deviceRepository.findTokensByUserId(userId)).containsExactlyInAnyOrder("good-token", "dead-token");
    }

    @Test
    void firebaseExceptionNeverBreaksRequestOrNotification() throws Exception {
        when(messaging.sendEachForMulticast(any(MulticastMessage.class))).thenThrow(new IllegalStateException("boom"));
        devices.register(userId, "good-token", DevicePlatform.WEB, null);

        assertThatCode(() -> notifications.create(userId, NotificationType.SYSTEM, "t", "b", null))
                .doesNotThrowAnyException();

        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                verify(messaging).sendEachForMulticast(any(MulticastMessage.class)));
        assertThat(notificationRepository.count()).isEqualTo(1);
        assertThat(deviceRepository.countByUserId(userId)).isEqualTo(1);
    }

    @TestConfiguration
    static class FcmWiring {

        @Bean
        FirebaseMessaging firebaseMessaging() {
            return mock(FirebaseMessaging.class);
        }

        @Bean
        PushSender fcmPushSender(FirebaseMessaging messaging, UserDeviceService devices) {
            return new FcmPushService(messaging, devices);
        }
    }
}
