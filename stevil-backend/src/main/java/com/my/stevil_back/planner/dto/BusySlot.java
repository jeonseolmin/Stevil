package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record BusySlot(@Min(0) @Max(6) int day, @NotNull LocalTime start, @NotNull LocalTime end,
                       @NotBlank @Size(max=60) String title, Boolean allowMeals, Boolean allowSnacks) {
    public BusySlot {
        allowMeals = Boolean.TRUE.equals(allowMeals);
        allowSnacks = Boolean.TRUE.equals(allowSnacks);
    }
    public BusySlot(int day, LocalTime start, LocalTime end, String title) {
        this(day, start, end, title, false, false);
    }
    public boolean allows(String kind) {
        return ("MEAL".equals(kind) && allowMeals) || ("SNACK".equals(kind) && allowSnacks);
    }
}
