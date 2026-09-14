package com.my.stevil_back.planner.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import com.my.stevil_back.planner.dto.*;
public record Save(@Min(0) long revision, @NotNull @Valid Preferences preferences,
                   @NotNull @Size(max=64) List<@Valid Event> events) {}
