package com.my.stevil_back.notification.push;

import lombok.extern.slf4j.Slf4j;

/*
 * 실제 전송을 하지 않는 구현. FirebaseConfig 가 FCM 이 꺼져 있거나(enabled=false) 초기화에 실패했을 때 이 구현을 bean 으로 만든다.
 */
@Slf4j
public class NoopPushSender implements PushSender {

    @Override
    public void send(PushPayload payload) {
        log.debug("Push disabled (noop): notificationId={}, userId={}, devices={}",
                payload.notificationId(), payload.userId(), payload.deviceTokens().size());
    }
}
