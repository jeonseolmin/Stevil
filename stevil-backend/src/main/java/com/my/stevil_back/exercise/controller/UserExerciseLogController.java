package com.my.stevil_back.exercise.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.exercise.dto.request.ExerciseLogRequest;
import com.my.stevil_back.exercise.dto.response.ExerciseLogDetailResponse;
import com.my.stevil_back.exercise.dto.response.WeeklyChartResponse;
import com.my.stevil_back.exercise.service.UserExerciseLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exercise-logs") // 이 컨트롤러의 기본 URL 주소
@RequiredArgsConstructor
public class UserExerciseLogController {

    private final UserExerciseLogService userExerciseLogService;

    // 1. 운동 기록 저장 API
    @PostMapping
    public ResponseEntity<Map<String, String>> saveExerciseLog(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody ExerciseLogRequest request) {

        Long realUserId = userDetails.getUserId();

        // Service 로직 호출 시 토큰에서 꺼낸 진짜 ID를 함께 전달합니다.
        userExerciseLogService.saveExerciseLog(realUserId, request);

        // 프론트엔드가 성공 여부를 알 수 있도록 JSON 메시지 반환
        return ResponseEntity.ok(Map.of("message", "운동 기록이 성공적으로 저장되었습니다."));
    }

    // 2. 주간 칼로리 차트 데이터 조회 API
    @GetMapping("/weekly-chart")
    public ResponseEntity<List<WeeklyChartResponse>> getWeeklyChart(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        Long realUserId = userDetails.getUserId();

        // Service 로직을 호출하여 날짜별로 합산된 차트용 리스트 획득
        List<WeeklyChartResponse> chartData = userExerciseLogService.getWeeklyCalorieChart(realUserId, startDate, endDate);

        // 프론트엔드로 리스트 반환
        return ResponseEntity.ok(chartData);
    }

    // 3. 운동 상세 기록 조회 API
    @GetMapping("/details")
    public ResponseEntity<List<ExerciseLogDetailResponse>> getExerciseLogDetails(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {

        Long realUserId = userDetails.getUserId();

        List<ExerciseLogDetailResponse> details = userExerciseLogService.getDetailedLogs(realUserId, startDate, endDate);

        return ResponseEntity.ok(details);
    }
}