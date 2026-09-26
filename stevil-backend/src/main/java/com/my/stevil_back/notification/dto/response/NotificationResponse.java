package com.my.stevil_back.notification.dto.response;

import com.my.stevil_back.notification.entity.Notification;
import com.my.stevil_back.notification.entity.enumType.NotificationType;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/*
 * readAt/createdAt 은 offset 을 포함해 내려준다(예: 2026-09-26T04:48:29Z).
 * 엔티티 값은 LocalDateTime.now() 로 JVM 기본 시간대(운영 컨테이너는 UTC) 기준으로 저장되므로
 * 같은 기본 시간대로 해석해 offset 을 붙인다. 브라우저는 이를 사용자 시간대로 표시한다.
 */
public record NotificationResponse(
        Long id,
        NotificationType type,
        String title,
        String body,
        String targetUrl,
        boolean read,
        OffsetDateTime readAt,
        OffsetDateTime createdAt
) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getBody(),
                notification.getTargetUrl(),
                notification.isRead(),
                withOffset(notification.getReadAt()),
                withOffset(notification.getCreatedAt())
        );
    }

    private static OffsetDateTime withOffset(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneId.systemDefault()).toOffsetDateTime();
    }
}
