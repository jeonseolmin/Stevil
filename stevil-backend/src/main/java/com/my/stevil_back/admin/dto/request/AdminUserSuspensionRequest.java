package com.my.stevil_back.admin.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminUserSuspensionRequest(

        @NotBlank(message = "정지 사유는 필수입니다.")
        @Size(max = 500, message = "정지 사유는 500자 이하여야 합니다.")
        String reason
) {
}