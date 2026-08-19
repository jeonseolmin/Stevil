package com.my.stevil_back.diet.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.diet.dto.DietDashboardResponse;
import com.my.stevil_back.diet.dto.DietRecordRequest;
import com.my.stevil_back.diet.service.DietService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/diet")
@RequiredArgsConstructor
public class DietController {

    private final DietService dietService;

    // 1. 대시보드 화면 전체 데이터 한 번에 불러오기
    @GetMapping("/dashboard")
    public ResponseEntity<DietDashboardResponse> getDashboard(
            @RequestParam(required = false) LocalDate date,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        // 날짜가 안 넘어오면 오늘 날짜로 세팅
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        return ResponseEntity.ok(dietService.getDashboardData(userDetails.getUserId(), targetDate));
    }

    // 2. 음식명 검색 (검색창)
    @GetMapping("/search")
    public ResponseEntity<?> searchFood(@RequestParam String keyword) {
        // 공공데이터 API 등을 호출하여 음식 영양정보 반환
        return ResponseEntity.ok(dietService.searchFood(keyword));
    }

    // 3. 식단 직접 입력 & 사진 등록
    @PostMapping("/record")
    public ResponseEntity<String> addDietRecord(
            @ModelAttribute DietRecordRequest request,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        dietService.addRecord(userDetails.getUserId(), request, image);
        return ResponseEntity.ok("식단이 기록되었습니다.");
    }
}