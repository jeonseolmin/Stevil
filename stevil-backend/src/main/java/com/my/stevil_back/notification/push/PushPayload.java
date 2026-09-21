package com.my.stevil_back.notification.push;

import java.util.List;

/*
 * 푸시 전송에 필요한 값만 담은 불변 객체(엔티티 아님). deviceTokens 는 전송 대상 기기 토큰이다.
 */
public record PushPayload(
        Long notificationId,
        Long userId,
        String title,
        String body,
        String targetUrl,
        List<String> deviceTokens
) {
}
