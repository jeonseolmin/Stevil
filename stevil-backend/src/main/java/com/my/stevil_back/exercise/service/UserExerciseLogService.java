package com.my.stevil_back.exercise.service;

import com.my.stevil_back.exercise.dto.request.ExerciseLogRequest;
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
    public void saveExerciseLog(ExerciseLogRequest request) {
        // 1. 어떤 운동인지 DB에서 조회
        Exercise exercise = exerciseRepository.findById(request.getExerciseId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 운동입니다."));

        // 2. 소모 칼로리 계산 (MET 공식 활용)
        int burnedCalories = 0;
        if (request.getDurationMinutes() != null && exercise.getCaloriesPer10Min() != null) {
            burnedCalories = (int) ((exercise.getCaloriesPer10Min() / 10.0) * request.getDurationMinutes());
        }

        // 3. Request DTO의 데이터를 Entity로 변환하여 저장
        UserExerciseLog log = UserExerciseLog.builder()
                .userId(request.getUserId())
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
        // 1. DB에서 해당 기간의 운동 기록을 모두 가져옴
        List<UserExerciseLog> logs = logRepository.findByUserIdAndExerciseDateBetween(userId, startDate, endDate);

        // 2. 날짜별로 그룹화하여 칼로리 합계 계산 (Java 8 Stream 활용)
        Map<LocalDate, Integer> dailyCalories = logs.stream()
                .filter(log -> log.getBurnedCalories() != null && log.getStatus() == ExerciseStatus.COMPLETED) // 완료된 운동만 합산
                .collect(Collectors.groupingBy(
                        UserExerciseLog::getExerciseDate,
                        Collectors.summingInt(UserExerciseLog::getBurnedCalories)
                ));

        // 3. 계산된 결과를 프론트엔드가 그리기 쉬운 DTO 리스트로 변환하여 반환
        return dailyCalories.entrySet().stream()
                .map(entry -> new WeeklyChartResponse(entry.getKey(), entry.getValue()))
                .sorted((a, b) -> a.getDate().compareTo(b.getDate())) // 날짜 오름차순 정렬
                .collect(Collectors.toList());
    }
}