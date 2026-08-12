package com.my.stevil_back.exercise.controller;

import com.my.stevil_back.exercise.entity.Exercise;
import com.my.stevil_back.exercise.service.ExerciseService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
public class ExerciseController {

    private final ExerciseService exerciseService;

    // 사용자 입력 키워드로 운동 목록 검색
    @GetMapping("/search")
    public ResponseEntity<List<Exercise>> searchExercises(@RequestParam String keyword) {
        List<Exercise> results = exerciseService.searchExercises(keyword);
        return ResponseEntity.ok(results);
    }

    // 조건에 맞는 운동 목록 추천 (맞춤형 추천 데이터 전달)
    @GetMapping("/recommend")
    public ResponseEntity<List<Exercise>> recommendExercises(
            @RequestParam String category,
            @RequestParam String difficulty,
            @RequestParam String equipment) {

        List<Exercise> recommendations = exerciseService.getRecommendedExercises(category, difficulty, equipment);
        return ResponseEntity.ok(recommendations);
    }

    // 1. 프론트엔드에서 넘어오는 다양한 타입의 데이터를 안전하게 받기 위한 DTO 클래스 추가
    @Data
    public static class CalorieRequestDto {
        private int durationMinutes;
        private Integer sets;
        private Integer reps;
        private Double weightKg;
        private boolean isAerobic;
    }

    // 💡 2. Map 대신 DTO를 사용하여 바뀐 서비스 파라미터에 맞게 값을 넘겨줌
    @PostMapping("/{id}/calculate-calories")
    public ResponseEntity<Map<String, Integer>> calculateCalories(
            @PathVariable Long id,
            @RequestBody CalorieRequestDto requestDto) {

        // Service 로직 호출 (6개의 파라미터를 모두 넘겨줍니다)
        int totalCalories = exerciseService.calculateCalories(
                id,
                requestDto.getDurationMinutes(),
                requestDto.getSets(),
                requestDto.getReps(),
                requestDto.getWeightKg(),
                requestDto.isAerobic()
        );

        // 프론트엔드에서 파싱하기 쉽게 JSON 객체 형태로 응답
        return ResponseEntity.ok(Map.of("burnedCalories", totalCalories));
    }
}