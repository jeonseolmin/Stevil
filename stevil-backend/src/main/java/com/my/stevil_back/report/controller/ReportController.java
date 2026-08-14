package com.my.stevil_back.report.controller;

import com.my.stevil_back.report.dto.ReportRequestDto;
import com.my.stevil_back.report.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @PostMapping
    public ResponseEntity<?> submitReport(@RequestBody ReportRequestDto requestDto, Authentication authentication) {
        try {
            // 1. 시큐리티 출입증에서 현재 로그인한 사람의 이메일(또는 ID) 꺼내기
            String reporterEmail = authentication.getName();

            // 2. 서비스에 일 시키기
            String resultMessage = reportService.createReport(reporterEmail, requestDto);

            // 3. 성공하면 리액트로 200 OK와 성공 메시지 전달
            return ResponseEntity.ok(resultMessage);

        } catch (IllegalArgumentException e) {
            // 중복 신고일 경우 400 Bad Request와 에러 메시지 전달
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            // 그 외 알 수 없는 에러 처리
            return ResponseEntity.internalServerError().body("신고 처리 중 서버 오류가 발생했습니다.");
        }
    }
}