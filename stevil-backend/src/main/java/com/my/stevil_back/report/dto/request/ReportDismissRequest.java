package com.my.stevil_back.report.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportDismissRequest(

        @NotBlank(message = "기각 사유는 필수입니다.")
        @Size(
                max = 1000,
                message = "기각 사유는 1000자 이하여야 합니다."
        )
        String adminNote
) {
}