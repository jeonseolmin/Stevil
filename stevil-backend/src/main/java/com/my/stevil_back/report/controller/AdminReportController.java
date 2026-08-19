package com.my.stevil_back.report.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.report.dto.*;
import com.my.stevil_back.report.dto.request.ReportDismissRequest;
import com.my.stevil_back.report.dto.request.ReportResolveRequest;
import com.my.stevil_back.report.dto.response.AdminReportResponse;
import com.my.stevil_back.report.entity.*;
import com.my.stevil_back.report.entity.enumType.ReportCategory;
import com.my.stevil_back.report.entity.enumType.ReportStatus;
import com.my.stevil_back.report.entity.enumType.ReportTargetType;
import com.my.stevil_back.report.service.AdminReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    @GetMapping
    public ResponseEntity<Page<AdminReportResponse>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false)
            ReportTargetType targetType,
            @RequestParam(required = false)
            ReportCategory category,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = DESC
            )
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                adminReportService.getReports(
                        status,
                        targetType,
                        category,
                        pageable
                )
        );
    }

    @GetMapping("/{reportId}")
    public ResponseEntity<AdminReportResponse> getReport(
            @PathVariable Long reportId
    ) {
        return ResponseEntity.ok(
                adminReportService.getReport(reportId)
        );
    }

    @PatchMapping("/{reportId}/review")
    public ResponseEntity<AdminReportResponse> startReview(
            @PathVariable Long reportId
    ) {
        return ResponseEntity.ok(
                adminReportService.startReview(reportId)
        );
    }

    @PatchMapping("/{reportId}/resolve")
    public ResponseEntity<AdminReportResponse> resolve(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long reportId,
            @Valid @RequestBody ReportResolveRequest request
    ) {
        return ResponseEntity.ok(
                adminReportService.resolve(
                        admin.getUserId(),
                        reportId,
                        request.action(),
                        request.adminNote()
                )
        );
    }

    @PatchMapping("/{reportId}/dismiss")
    public ResponseEntity<AdminReportResponse> dismiss(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long reportId,
            @Valid @RequestBody ReportDismissRequest request
    ) {
        return ResponseEntity.ok(
                adminReportService.dismiss(
                        admin.getUserId(),
                        reportId,
                        request.adminNote()
                )
        );
    }
}