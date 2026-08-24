package com.my.stevil_back.exercise.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class ExerciseLogDetailResponse {
    private Long logId;
    private String exerciseName;
    private Integer durationMinutes;
    private Integer sets;
    private Integer burnedCalories;
    private LocalDate exerciseDate;
    private String category;
}