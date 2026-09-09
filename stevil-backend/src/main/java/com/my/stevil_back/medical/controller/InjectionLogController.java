package com.my.stevil_back.medical.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.medical.dto.InjectionRequestDto;
import com.my.stevil_back.medical.entity.InjectionLog;
import com.my.stevil_back.medical.service.InjectionLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/injections")
@RequiredArgsConstructor
public class InjectionLogController {

    private final InjectionLogService injectionLogService;

    // 1. 주사 일기 기록 저장
    @PostMapping
    public ResponseEntity<String> saveInjectionLog(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody InjectionRequestDto requestDto) {

        Long realUserId = userDetails.getUserId();

        injectionLogService.saveLog(realUserId, requestDto);
        return ResponseEntity.ok("주사 일기가 성공적으로 저장되었습니다.");
    }

    // 2. 본인의 최근 기록만 조회
    @GetMapping("/recent")
    public ResponseEntity<List<InjectionLog>> getRecentLogs(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long realUserId = userDetails.getUserId();

        List<InjectionLog> logs = injectionLogService.getRecentLogs(realUserId);
        return ResponseEntity.ok(logs);
    }
}