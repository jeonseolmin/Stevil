package com.my.stevil_back.notification.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeviceTokenDeleteRequest(
        @NotBlank
        @Size(max = 1024)
        String token
) {
}
