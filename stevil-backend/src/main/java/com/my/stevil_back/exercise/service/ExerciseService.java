package com.my.stevil_back.exercise.service;

import com.my.stevil_back.exercise.entity.Exercise;
import com.my.stevil_back.exercise.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 읽기 전용 트랜잭션 적용
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;

    // 칼로리 계산 시 매번 DB를 조회하지 않도록 데이터를 캐싱할 Map
    // 멀티스레드 환경을 고려하여 ConcurrentHashMap 사용
    private final Map<Long, Integer> calorieCache = new ConcurrentHashMap<>();

//    1. 운동 소모 칼로리 계산 로직
    public int calculateCalories(Long exerciseId, int durationMinutes) {
        // Map에 해당 운동 ID의 칼로리 값이 없으면 DB에서 조회 후 저장, 있으면 Map에서 바로 꺼내옴
        int caloriesPer10Min = calorieCache.computeIfAbsent(exerciseId, id ->
                exerciseRepository.findById(id)
                        .map(Exercise::getCaloriesPer10Min)
                        .orElse(0) // 운동을 찾지 못하면 0 반환
        );

        // 10분당 칼로리를 바탕으로 실제 운동 시간 비례 계산
        return (int) ((caloriesPer10Min / 10.0) * durationMinutes);
    }

// 2. 검색어로 운동 찾기 (사용자가 '스쿼트' 검색 시)
    public List<Exercise> searchExercises(String keyword) {
        return exerciseRepository.findByNameContaining(keyword);
    }


// 3. AI 맞춤 추천 필터링 로직 (유저 상태에 맞춰 추천)
    public List<Exercise> getRecommendedExercises(String category, String difficulty, String equipment) {
        return exerciseRepository.findByCategoryAndDifficultyAndEquipment(category, difficulty, equipment);
    }
}