package com.my.stevil_back.exercise.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class ExerciseLogDetailResponse {
    private Long logId;
    private String exerciseName; // 조인해서 가져올 운동 이름
    private Integer durationMinutes;
    private Integer sets;
    private Integer burnedCalories;
    private LocalDate exerciseDate;
}