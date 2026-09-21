package com.my.stevil_back.notification.event;

/*
 * 알림이 저장되었음을 알리는 이벤트. 엔티티가 아니라 ID만 담는다 — 리스너는 커밋 이후(다른 스레드일 수 있음)에
 * 실행되므로 LAZY 연관을 건드리지 않고 필요한 값을 ID로 다시 읽는다.
 */
public record NotificationCreatedEvent(Long notificationId, Long userId) {
}
