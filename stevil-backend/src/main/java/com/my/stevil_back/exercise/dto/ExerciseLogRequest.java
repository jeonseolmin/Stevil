package com.my.stevil_back.exercise.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Getter
@NoArgsConstructor
public class ExerciseLogRequest {
    private Long userId;
    private Long exerciseId; // 어떤 운동인지 (예: 스쿼트 ID)
    private LocalDate exerciseDate;
    private String status; // "PLANNED" 또는 "COMPLETED"

    // 상세 정보 (유산소/무산소 공통)
    private Integer durationMinutes;
    private Integer sets;
    private Integer repsPerSet;
    private Double weightKg;

    // 컨디션 정보
    private String conditionStatus;
    private String memo;
}