package com.my.stevil_back.exercise.controller;

import com.my.stevil_back.exercise.dto.ExerciseLogRequest;
import com.my.stevil_back.exercise.dto.WeeklyChartResponse;
import com.my.stevil_back.exercise.service.UserExerciseLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<Map<String, String>> saveExerciseLog(@RequestBody ExerciseLogRequest request) {
        // Service 로직을 호출하여 DB 저장 및 칼로리 계산 수행
        userExerciseLogService.saveExerciseLog(request);

        // 프론트엔드가 성공 여부를 알 수 있도록 JSON 메시지 반환
        return ResponseEntity.ok(Map.of("message", "운동 기록이 성공적으로 저장되었습니다."));
    }

// 2. 주간 칼로리 차트 데이터 조회 API
    @GetMapping("/weekly-chart")
    public ResponseEntity<List<WeeklyChartResponse>> getWeeklyChart(
            @RequestParam Long userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        // Service 로직을 호출하여 날짜별로 합산된 차트용 리스트 획득
        List<WeeklyChartResponse> chartData = userExerciseLogService.getWeeklyCalorieChart(userId, startDate, endDate);

        // 프론트엔드로 리스트 반환
        return ResponseEntity.ok(chartData);
    }
}