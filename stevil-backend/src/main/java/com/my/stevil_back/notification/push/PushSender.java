package com.my.stevil_back.notification.push;

/*
 * 푸시 전달 채널 추상화. 알림은 이미 DB에 저장되어 있고, 이 인터페이스는 "전달 시도"만 담당한다.
 * 구현체는 실패해도 알림 저장에 영향이 없어야 하며, 호출하는 쪽(NotificationPushListener)이 예외를 잡아 로그만 남긴다.
 *
 * 현재 구현: NoopPushSender (실제 전송 없음). FCM 구현은 별도 PR에서 이 인터페이스를 구현한다.
 */
public interface PushSender {

    void send(PushPayload payload);
}
