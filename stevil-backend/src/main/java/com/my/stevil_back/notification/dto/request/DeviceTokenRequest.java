package com.my.stevil_back.notification.dto.request;

import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/*
 * userId 는 받지 않는다 — 소유자는 항상 인증된 사용자다.
 * FCM 토큰은 영숫자와 - _ : . 로만 이루어지므로 그 외 문자는 거부한다(로그 인젝션/멀티바이트로 인한 인덱스 크기 문제 방지).
 */
public record DeviceTokenRequest(
        @NotBlank
        @Size(max = 1024)
        @Pattern(regexp = "[A-Za-z0-9_:.\\-]+", message = "FCM 토큰 형식이 올바르지 않습니다.")
        String token,

        @NotNull
        DevicePlatform platform
) {
}
