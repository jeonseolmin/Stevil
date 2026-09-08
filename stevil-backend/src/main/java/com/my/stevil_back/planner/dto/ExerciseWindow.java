package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record ExerciseWindow(@Min(0) @Max(6) int day, @NotNull LocalTime start, @NotNull LocalTime end) {}
