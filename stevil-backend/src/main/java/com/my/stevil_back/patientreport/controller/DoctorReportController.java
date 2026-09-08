package com.my.stevil_back.patientreport.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.patientreport.service.PatientReportService;
import lombok.RequiredArgsConstructor;
import com.my.stevil_back.patientreport.dto.request.DoctorFeedbackRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
public class DoctorReportController {

    private final PatientReportService patientReportService;

    // 의사 -> 수신함 조회 API
    @GetMapping("/reports")
    public ResponseEntity<List<Map<String, Object>>> getReports(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        List<Map<String, Object>> reports = patientReportService.getReportsForDoctor(userDetails.getUser().getId());
        return ResponseEntity.ok(reports);
    }

    // 의사 -> 피드백 전송 API
    @PostMapping("/feedback")
    public ResponseEntity<?> sendFeedback(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @jakarta.validation.Valid @RequestBody DoctorFeedbackRequest request) {

        patientReportService.sendFeedback(userDetails.getUser().getId(), request.reportId(), request.content());
        return ResponseEntity.ok(Map.of("message", "환자에게 피드백이 전송되었습니다."));
    }

}
