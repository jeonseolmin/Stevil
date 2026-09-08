package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record ExerciseEvidence(
        @NotBlank @Size(max=200) String evidenceId,
        @NotNull @Size(max=1000) String title,
        @NotNull @Size(max=1000) String section,
        @NotNull @Size(max=100000) String text,
        @NotBlank @Size(max=200) String sourceId,
        @NotNull @Size(max=2000) @Pattern(regexp="https://[^\\s]+") String url,
        @NotNull @Size(max=1000) String population,
        @Size(max=100) String recommendationGrade,
        @Size(max=300) String recommendationStrength,
        boolean recommendation, boolean glp1Specific,
        @NotNull @Size(max=100) String reviewStatus,
        @DecimalMin("-1") @DecimalMax("1") Double retrievalScore) {}
