package com.my.stevil_back.reminder.entity.enumType;

public enum DeliveryStatus {
    SENT,
    /** grace window(기본 10분)를 넘겨 늦게 처리된 회차. 몰아서 보내지 않는다. */
    SKIPPED_MISSED,
    /** 정지 계정. Notification 을 만들지 않는다. */
    SKIPPED_SUSPENDED
}
