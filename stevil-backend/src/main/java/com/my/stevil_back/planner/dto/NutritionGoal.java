package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record NutritionGoal(@DecimalMin("20") @DecimalMax("350") double weightKg,
        @DecimalMin("0.1") @DecimalMax("3") double proteinPerKg,
        @Min(1000) @Max(5000) int calories, boolean confirmed) {}
