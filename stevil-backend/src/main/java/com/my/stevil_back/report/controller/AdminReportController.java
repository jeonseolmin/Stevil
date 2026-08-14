package com.my.stevil_back.report.controller;

import com.my.stevil_back.report.entity.Report;
import com.my.stevil_back.report.service.AdminReportService;
import com.my.stevil_back.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final ReportService reportService;
    private final AdminReportService adminReportService;

    // 관리자 전용 신고 내역 전체 조회 API
    @GetMapping
    public ResponseEntity<List<Report>> getReportList() {
        List<Report> reports = reportService.getAllReportsForAdmin();
        return ResponseEntity.ok(reports);
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<String> deleteReportedPost(@PathVariable Long postId) {
        adminReportService.deletePostByAdmin(postId);
        return ResponseEntity.ok("신고된 게시글이 삭제되었습니다.");
    }

    // 📢 2. 신고된 댓글 강제 삭제
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<String> deleteReportedComment(@PathVariable Long commentId) {
        adminReportService.deleteCommentByAdmin(commentId);
        return ResponseEntity.ok("신고된 댓글이 삭제되었습니다.");
    }
}