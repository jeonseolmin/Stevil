package com.my.stevil_back.notification.push;

import com.my.stevil_back.notification.entity.Notification;
import com.my.stevil_back.notification.event.NotificationCreatedEvent;
import com.my.stevil_back.notification.repository.NotificationRepository;
import com.my.stevil_back.notification.repository.UserDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * 다음 PR에서 이 메서드에 @Async(전용 executor)를 붙여 요청 스레드와 분리한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationPushListener {

    private final NotificationRepository notificationRepository;
    private final UserDeviceRepository userDeviceRepository;
    private final PushSender pushSender;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        try {
            Notification notification = notificationRepository.findById(event.notificationId()).orElse(null);

            if (notification == null) {
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
