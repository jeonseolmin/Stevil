package com.my.stevil_back.ai.controller;

import com.my.stevil_back.ai.service.AiDoctorAssistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/logs")
@RequiredArgsConstructor
public class AiLogController {

    private final AiDoctorAssistService aiDoctorAssistService;

    @PostMapping("/analyze")
    public ResponseEntity<String> analyzeLog(@RequestBody Map<String, String> requestBody) {
        String logText = requestBody.get("logText");

        if (logText == null || logText.isEmpty()) {
            return ResponseEntity.badRequest().body("분석할 일지 데이터가 없습니다.");
        }

        String aiSummary = aiDoctorAssistService.analyzeMedicationLogText(logText);
        return ResponseEntity.ok(aiSummary);
    }
}