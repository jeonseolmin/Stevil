package com.my.stevil_back.exercise.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "user_exercise_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserExerciseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // --- 1. 기본 관계 매핑 ---
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exercise_id", nullable = false)
    private Exercise exercise;

    @Column(name = "exercise_date", nullable = false)
    private LocalDate exerciseDate;

    // --- 2. 일정 관리 (새로 추가됨) ---
    @Enumerated(EnumType.STRING) // Enum 이름을 문자열로 DB에 저장
    @Column(nullable = false, length = 20)
    private ExerciseStatus status; // PLANNED, COMPLETED, SKIPPED

    // --- 3. 운동 상세 수치 (유산소/무산소 통합) ---
    @Column(name = "duration_minutes")
    private Integer durationMinutes; // 운동 시간 (분)

    @Column(name = "sets")
    private Integer sets; // 세트 수 (무산소용)

    @Column(name = "reps_per_set")
    private Integer repsPerSet; // 세트당 반복 횟수 (무산소용)

    @Column(name = "weight_kg")
    private Double weightKg; // 중량 (kg) (무산소용)

    @Column(name = "burned_calories")
    private Integer burnedCalories; // 소모 칼로리 (인바디 or 자체 계산)

    // --- 4. 컨디션 및 피드백 ---
    @Column(name = "condition_status", length = 20)
    private String conditionStatus; // 컨디션 (예: 좋음, 메스꺼움)

    @Column(columnDefinition = "TEXT")
    private String memo; // 특이사항 메모

    @Builder
    public UserExerciseLog(Long userId, Exercise exercise, LocalDate exerciseDate,
                           ExerciseStatus status, Integer durationMinutes, Integer sets,
                           Integer repsPerSet, Double weightKg, Integer burnedCalories,
                           String conditionStatus, String memo) {
        this.userId = userId;
        this.exercise = exercise;
        this.exerciseDate = exerciseDate;
        this.status = status;
        this.durationMinutes = durationMinutes;
        this.sets = sets;
        this.repsPerSet = repsPerSet;
        this.weightKg = weightKg;
        this.burnedCalories = burnedCalories;
        this.conditionStatus = conditionStatus;
        this.memo = memo;
    }
}