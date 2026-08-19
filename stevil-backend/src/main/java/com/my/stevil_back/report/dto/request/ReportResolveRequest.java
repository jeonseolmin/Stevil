package com.my.stevil_back.report.dto.request;

import com.my.stevil_back.report.entity.enumType.ReportAction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportResolveRequest(

        @NotNull(message = "관리자 조치는 필수입니다.")
        ReportAction action,

        @Size(
                max = 1000,
                message = "관리자 메모는 1000자 이하여야 합니다."
        )
        String adminNote
) {
}