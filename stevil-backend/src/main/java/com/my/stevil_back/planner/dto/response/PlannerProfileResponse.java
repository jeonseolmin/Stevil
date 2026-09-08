package com.my.stevil_back.planner.dto.response;

import java.time.LocalDateTime;

public record PlannerProfileResponse(Double weightKg, LocalDateTime weightRecordedAt, Double heightCm, Integer age, String sex) {}
