package com.my.stevil_back.notification.push;

import com.my.stevil_back.notification.config.NotificationAsyncConfig;
import com.my.stevil_back.notification.entity.Notification;
import com.my.stevil_back.notification.event.NotificationCreatedEvent;
import com.my.stevil_back.notification.repository.NotificationRepository;
import com.my.stevil_back.notification.repository.UserDeviceRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/*
 * 알림 저장 트랜잭션이 커밋된 뒤에만 푸시를 시도한다(AFTER_COMMIT).
 *
 *  - DB 커밋이 source of truth 이다. 이 리스너는 이미 커밋된 뒤에 실행되므로 무엇이 실패해도 알림은 롤백되지 않는다.
 *  - AFTER_COMMIT 리스너에서 던진 예외는 호출자(요청)에게 그대로 전파되므로, 여기서 모두 잡아 로그만 남긴다.
 *  - 이벤트에는 ID만 있으므로 필요한 값(제목/내용/토큰)을 다시 읽는다. LAZY 연관(user)은 건드리지 않는다.
 *
 * @Async(notificationPushExecutor)로 요청 스레드와 분리한다. 이 시점에는 트랜잭션이 없으므로 repository 조회는 각자 짧은 트랜잭션이다.
 *
 * 정지(suspended) 계정: 알림은 DB 에 저장되지만 푸시 전달만 건너뛴다. 기기 토큰은 지우지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationPushListener {

    private final NotificationRepository notificationRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;
    private final PushSender pushSender;

    @Async(NotificationAsyncConfig.PUSH_EXECUTOR)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        try {
            Notification notification = notificationRepository.findById(event.notificationId()).orElse(null);

            if (notification == null) {
                return;
            }

            User user = userRepository.findById(event.userId()).orElse(null);

            if (user == null || user.isSuspended()) {
                log.info("Push skipped (user missing or suspended): notificationId={}, userId={}",
                        event.notificationId(), event.userId());
                return;
            }

            List<String> tokens = userDeviceRepository.findTokensByUserId(event.userId());

            if (tokens.isEmpty()) {
                return;
            }

            pushSender.send(new PushPayload(
                    notification.getId(),
                    event.userId(),
                    notification.getTitle(),
                    notification.getBody(),
                    notification.getTargetUrl(),
                    List.copyOf(tokens)
            ));
        } catch (Exception e) {
            // 토큰 값이 예외 메시지에 섞여 나가지 않도록 메시지 없이 예외 유형만 남긴다.
            log.warn("Push dispatch failed (notification kept): notificationId={}, userId={}, error={}",
                    event.notificationId(), event.userId(), e.getClass().getSimpleName());
        }
    }
}
