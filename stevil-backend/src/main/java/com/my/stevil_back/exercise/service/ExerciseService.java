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
@Transactional(readOnly = true)
public class ExerciseService {

    private final ExerciseRepository exerciseRepository;
    private final Map<Long, Integer> calorieCache = new ConcurrentHashMap<>();

    // 1. 운동 소모 칼로리 계산 로직 (💡 Integer, Double 래퍼 클래스로 변경하여 Null 방지)
    public int calculateCalories(Long exerciseId, int durationMinutes, Integer sets, Integer reps, Double weightKg, boolean isAerobic) {

        int caloriesPer10Min = calorieCache.computeIfAbsent(exerciseId, id ->
                exerciseRepository.findById(id)
                        .map(Exercise::getCaloriesPer10Min)
                        .orElse(0)
        );

        // 1. 기본 시간 비례 계산
        double baseCalories = (caloriesPer10Min / 10.0) * durationMinutes;

        // 2. 무산소 운동일 경우 볼륨 보너스 추가
        if (!isAerobic) {
            // 프론트에서 null이 넘어올 경우를 대비한 안전 장치 (Null-safe)
            int safeSets = (sets != null) ? sets : 0;
            int safeReps = (reps != null) ? reps : 0;
            double safeWeight = (weightKg != null) ? weightKg : 0.0;

            double volumeBonus = (safeSets * safeReps * safeWeight) * 0.02;
            return (int) (baseCalories + volumeBonus);
        }

        return (int) baseCalories;
    }

    // 2. 검색어로 운동 찾기
    public List<Exercise> searchExercises(String keyword) {
        return exerciseRepository.findByNameContaining(keyword);
    }

    // 3. AI 맞춤 추천 필터링 로직
    public List<Exercise> getRecommendedExercises(String category, String difficulty, String equipment) {
        return exerciseRepository.findByCategoryAndDifficultyAndEquipment(category, difficulty, equipment);
    }
}