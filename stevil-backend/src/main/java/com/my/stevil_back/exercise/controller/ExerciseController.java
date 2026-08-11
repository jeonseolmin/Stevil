package com.my.stevil_back.exercise.controller;

import com.my.stevil_back.exercise.entity.Exercise;
import com.my.stevil_back.exercise.service.ExerciseService;
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



//  조건에 맞는 운동 목록 추천 (맞춤형 추천 데이터 전달)
    @GetMapping("/recommend")
    public ResponseEntity<List<Exercise>> recommendExercises(
            @RequestParam String category,
            @RequestParam String difficulty,
            @RequestParam String equipment) {

        List<Exercise> recommendations = exerciseService.getRecommendedExercises(category, difficulty, equipment);
        return ResponseEntity.ok(recommendations);
    }


//     특정 운동을 일정 시간(분) 수행했을 때 소모된 칼로리 반환
    @PostMapping("/{id}/calculate-calories")
    public ResponseEntity<Map<String, Integer>> calculateCalories(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> requestBody) {

        int durationMinutes = requestBody.getOrDefault("durationMinutes", 0);
        int totalCalories = exerciseService.calculateCalories(id, durationMinutes);

        // 프론트엔드에서 파싱하기 쉽게 JSON 객체 형태로 응답
        return ResponseEntity.ok(Map.of("burnedCalories", totalCalories));
    }
}