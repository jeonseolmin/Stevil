package com.my.stevil_back.report.dto.response;

import com.my.stevil_back.report.entity.*;
import com.my.stevil_back.report.entity.enumType.ReportAction;
import com.my.stevil_back.report.entity.enumType.ReportCategory;
import com.my.stevil_back.report.entity.enumType.ReportStatus;
import com.my.stevil_back.report.entity.enumType.ReportTargetType;

import java.time.LocalDateTime;

public record AdminReportResponse(
        Long id,
        String reporterEmail,
        ReportTargetType targetType,
        Long targetId,
        ReportCategory category,
        String reason,
        ReportStatus status,
        ReportAction adminAction,
        String adminNote,
        Long processedBy,
        LocalDateTime processedAt,
        LocalDateTime createdAt
) {

    public static AdminReportResponse from(Report report) {
        return new AdminReportResponse(
                report.getId(),
                report.getReporterEmail(),
                report.getTargetType(),
                report.getTargetId(),
                report.getCategory(),
                report.getReason(),
                report.getStatus(),
                report.getAdminAction(),
                report.getAdminNote(),
                report.getProcessedBy(),
                report.getProcessedAt(),
                report.getCreatedAt()
        );
    }
}