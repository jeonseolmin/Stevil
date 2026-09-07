package com.my.stevil_back.patientreport.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.patientreport.service.PatientReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patient-reports")
@RequiredArgsConstructor
public class PatientReportController {

    private final PatientReportService patientReportService;

    // 환자 -> 의사 전송 API
    @PostMapping("/send")
    public ResponseEntity<?> sendReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> request) {

        patientReportService.sendReport(userDetails.getUser().getId(), request.get("aiSummary"));
        return ResponseEntity.ok(Map.of("message", "주치의에게 리포트가 성공적으로 전송되었습니다."));
    }

    // 의사 -> 수신함 조회 API
    @GetMapping("/doctor")
    public ResponseEntity<List<Map<String, Object>>> getReports(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        List<Map<String, Object>> reports = patientReportService.getReportsForDoctor(userDetails.getUser().getId());
        return ResponseEntity.ok(reports);
    }

    // 의사 -> 피드백 전송 API
    @PostMapping("/{reportId}/feedback")
    public ResponseEntity<?> sendFeedback(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long reportId,
            @RequestBody Map<String, String> request) {

        patientReportService.sendFeedback(userDetails.getUser().getId(), reportId, request.get("content"));
        return ResponseEntity.ok(Map.of("message", "환자에게 피드백이 전송되었습니다."));
    }

    // 환자 -> 나에게 온 피드백 조회 API
    @GetMapping("/my-feedbacks")
    public ResponseEntity<List<Map<String, Object>>> getMyFeedbacks(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        List<Map<String, Object>> feedbacks = patientReportService.getFeedbacksForPatient(userDetails.getUser().getId());
        return ResponseEntity.ok(feedbacks);
    }
}