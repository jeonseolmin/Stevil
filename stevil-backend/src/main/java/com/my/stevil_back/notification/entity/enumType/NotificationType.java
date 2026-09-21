package com.my.stevil_back.notification.entity.enumType;

/*
 * 알림 종류. DB에는 문자열(EnumType.STRING)로 저장되므로 값을 추가하는 것은 안전하지만
 * 기존 값의 이름을 바꾸거나 지우면 이미 저장된 알림을 읽을 수 없게 된다.
 */
public enum NotificationType {
    SYSTEM,
    ADMIN,
    COMMENT,
    INQUIRY,
    REPORT,
    AD
}
