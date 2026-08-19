package com.my.stevil_back.report.dto.request;

import com.my.stevil_back.report.entity.enumType.ReportCategory;
import com.my.stevil_back.report.entity.enumType.ReportTargetType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ReportRequestDto {

    @NotNull(message = "신고 대상 유형은 필수입니다.")
    private ReportTargetType targetType;

    @NotNull(message = "신고 대상 번호는 필수입니다.")
    private Long targetId;

    @NotNull(message = "신고 분류는 필수입니다.")
    private ReportCategory category;

    @NotBlank(message = "신고 사유는 필수입니다.")
    @Size(
            max = 500,
            message = "신고 사유는 500자 이하여야 합니다."
    )
    private String reason;
}