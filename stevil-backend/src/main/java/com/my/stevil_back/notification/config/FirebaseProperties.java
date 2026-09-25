package com.my.stevil_back.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/*
 * enabled=false(기본)이면 실제 FCM 전송을 하지 않는다. credentialsPath 는 service-account JSON "파일 경로"이며
 * JSON 내용은 설정/환경변수로 받지 않는다.
 */
@ConfigurationProperties(prefix = "stevil.firebase")
public record FirebaseProperties(
        @DefaultValue("false") boolean enabled,
        @DefaultValue("") String credentialsPath
) {
}
