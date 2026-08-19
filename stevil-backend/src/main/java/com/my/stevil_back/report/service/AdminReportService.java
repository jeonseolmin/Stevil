package com.my.stevil_back.report.service;

import com.my.stevil_back.comment.repository.CommentRepository;
import com.my.stevil_back.post.repository.PostRepository;
import com.my.stevil_back.report.dto.response.AdminReportResponse;
import com.my.stevil_back.report.entity.*;
import com.my.stevil_back.report.entity.enumType.ReportAction;
import com.my.stevil_back.report.entity.enumType.ReportCategory;
import com.my.stevil_back.report.entity.enumType.ReportStatus;
import com.my.stevil_back.report.entity.enumType.ReportTargetType;
import com.my.stevil_back.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ReportRepository reportRepository;

    public Page<AdminReportResponse> getReports(
            ReportStatus status,
            ReportTargetType targetType,
            ReportCategory category,
            Pageable pageable
    ) {
        return reportRepository.searchForAdmin(
                status,
                targetType,
                category,
                pageable
        ).map(AdminReportResponse::from);
    }

    public AdminReportResponse getReport(Long reportId) {
        return AdminReportResponse.from(
                findReport(reportId)
        );
    }

    @Transactional
    public AdminReportResponse startReview(Long reportId) {
        Report report = findReport(reportId);

        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "검토 대기 상태의 신고만 검토할 수 있습니다."
            );
        }

        report.startReview();

        return AdminReportResponse.from(report);
    }

    @Transactional
    public AdminReportResponse resolve(
            Long adminId,
            Long reportId,
            ReportAction action,
            String adminNote
    ) {
        Report report = findReport(reportId);
        validateNotCompleted(report);

        if (action == ReportAction.CONTENT_DELETED) {
            deleteTarget(report);
        }

        report.resolve(
                adminId,
                action,
                trimToNull(adminNote)
        );

        return AdminReportResponse.from(report);
    }

    @Transactional
    public AdminReportResponse dismiss(
            Long adminId,
            Long reportId,
            String adminNote
    ) {
        Report report = findReport(reportId);
        validateNotCompleted(report);

        report.dismiss(
                adminId,
                adminNote.trim()
        );

        return AdminReportResponse.from(report);
    }

    private void deleteTarget(Report report) {
        if (report.getTargetType() == ReportTargetType.POST) {
            deletePost(report.getTargetId());
            return;
        }

        if (report.getTargetType() == ReportTargetType.COMMENT) {
            deleteComment(report.getTargetId());
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "지원하지 않는 신고 대상입니다."
        );
    }

    private void deletePost(Long postId) {
        if (!postRepository.existsById(postId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "삭제할 게시글을 찾을 수 없습니다."
            );
        }

        postRepository.deleteById(postId);
    }

    private void deleteComment(Long commentId) {
        if (!commentRepository.existsById(commentId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "삭제할 댓글을 찾을 수 없습니다."
            );
        }

        commentRepository.deleteById(commentId);
    }

    private void validateNotCompleted(Report report) {
        if (report.isCompleted()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 처리가 완료된 신고입니다."
            );
        }
    }

    private Report findReport(Long reportId) {
        return reportRepository.findById(reportId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "신고를 찾을 수 없습니다."
                ));
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}