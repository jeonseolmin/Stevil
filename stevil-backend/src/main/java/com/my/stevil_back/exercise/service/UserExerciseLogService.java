package com.my.stevil_back.exercise.service;

import com.my.stevil_back.exercise.dto.request.ExerciseLogRequest;
import com.my.stevil_back.exercise.dto.response.ExerciseLogDetailResponse;
import com.my.stevil_back.exercise.dto.response.WeeklyChartResponse;
import com.my.stevil_back.exercise.entity.Exercise;
import com.my.stevil_back.exercise.entity.ExerciseStatus;
import com.my.stevil_back.exercise.entity.UserExerciseLog;
import com.my.stevil_back.exercise.repository.ExerciseRepository;
import com.my.stevil_back.exercise.repository.UserExerciseLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserExerciseLogService {

    private final UserExerciseLogRepository logRepository;
    private final ExerciseRepository exerciseRepository;

    //  1. 운동 기록 저장 및 칼로리 자동 계산
    @Transactional
    public void saveExerciseLog(Long userId, ExerciseLogRequest request) {
        Exercise exercise = exerciseRepository.findById(request.getExerciseId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 운동입니다."));

        int burnedCalories = 0;
        if (request.getDurationMinutes() != null && exercise.getCaloriesPer10Min() != null) {
            // 1. 기본 칼로리 (순수 운동 시간에 비례)
            double baseCalories = (exercise.getCaloriesPer10Min() / 10.0) * request.getDurationMinutes();

            // 2. 무산소 운동 보너스 칼로리 (프론트엔드 공식과 일치)
            // (세트 x 횟수 x 중량) * 0.02
            double volumeBonus = 0.0;
            if (request.getSets() != null && request.getRepsPerSet() != null && request.getWeightKg() != null) {
                volumeBonus = request.getSets() * request.getRepsPerSet() * request.getWeightKg() * 0.02;
            }

            // 3. 최종 칼로리 합산
            burnedCalories = (int) (baseCalories + volumeBonus);
        }

        UserExerciseLog log = UserExerciseLog.builder()
                .userId(userId)
                .exercise(exercise)
                .exerciseDate(request.getExerciseDate())
                .status(ExerciseStatus.valueOf(request.getStatus()))
                .durationMinutes(request.getDurationMinutes())
                .sets(request.getSets())
                .repsPerSet(request.getRepsPerSet())
                .weightKg(request.getWeightKg())
                .burnedCalories(burnedCalories)
                .conditionStatus(request.getConditionStatus())
                .memo(request.getMemo())
                .build();

        logRepository.save(log);
    }

    // 2. 주간 칼로리 소모량 차트 데이터 가공
    public List<WeeklyChartResponse> getWeeklyCalorieChart(Long userId, LocalDate startDate, LocalDate endDate) {
        List<UserExerciseLog> logs = logRepository.findByUserIdAndExerciseDateBetween(userId, startDate, endDate);

        Map<LocalDate, Integer> dailyCalories = logs.stream()
                .filter(log -> log.getBurnedCalories() != null && log.getStatus() == ExerciseStatus.COMPLETED)
                .collect(Collectors.groupingBy(
                        UserExerciseLog::getExerciseDate,
                        Collectors.summingInt(UserExerciseLog::getBurnedCalories)
                ));

        return dailyCalories.entrySet().stream()
                .map(entry -> new WeeklyChartResponse(entry.getKey(), entry.getValue()))
                .sorted((a, b) -> a.getDate().compareTo(b.getDate()))
                .collect(Collectors.toList());
    } // 💡 기존 메서드는 여기서 딱 닫아줍니다.

    // 💡 3. 새로 추가한 상세 조회 메서드 (괄호 밖으로 꺼내고 logRepository로 이름 맞춤!)
    public List<ExerciseLogDetailResponse> getDetailedLogs(Long userId, LocalDate startDate, LocalDate endDate) {
        return logRepository.findDetailedLogs(userId, startDate, endDate);
    }
}