package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record FoodComponent(@NotBlank @Size(max=80) String foodId, @NotBlank @Size(max=300) String name,
        @NotNull @Pattern(regexp="staple|protein|vegetable|snack") String role,
        @NotNull @Pattern(regexp="https://www\\.data\\.go\\.kr/data/15127578/openapi\\.do") String sourceUrl,
        @NotNull @Size(max=80) String retrievedAt,
        @NotNull @Pattern(regexp="[0-9]+(?:\\.[0-9]+)?") @Size(max=20) String basisWeight,
        @NotNull @Pattern(regexp="[0-9]+(?:\\.[0-9]+)?") @Size(max=20) String servingWeight,
        @NotNull @Size(max=5) Map<@Size(max=20) String, @Size(max=100) String> nutrition,
        @NotNull @Pattern(regexp="[a-f0-9]{64}") String fingerprint,
        @NotNull @Size(max=5) Map<@Size(max=20) String, @Size(max=100) String> amountNutrition) {}
