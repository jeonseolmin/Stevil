package com.my.stevil_back.notification.push;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/*
 * 실제 전송을 하지 않는 기본 구현. stevil.firebase.enabled 가 true 가 아닐 때(기본값 포함) 사용된다.
 * FCM 구현이 추가되면 그쪽이 stevil.firebase.enabled=true 일 때만 활성화되어 이 빈과 배타적으로 동작한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "stevil.firebase.enabled", havingValue = "false", matchIfMissing = true)
public class NoopPushSender implements PushSender {

    @Override
    public void send(PushPayload payload) {
        log.debug("Push disabled (noop): notificationId={}, userId={}, devices={}",
                payload.notificationId(), payload.userId(), payload.deviceTokens().size());
    }
}
