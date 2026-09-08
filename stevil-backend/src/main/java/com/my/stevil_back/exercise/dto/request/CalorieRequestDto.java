package com.my.stevil_back.exercise.dto.request;

import lombok.Data;

@Data
public class CalorieRequestDto {
    private int durationMinutes;
    private Integer sets;
    private Integer reps;
    private Double weightKg;
    private boolean isAerobic;
}
