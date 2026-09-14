package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record Preferences(@NotNull LocalDate weekStart, @NotNull LocalTime wakeTime, @NotNull LocalTime sleepTime,
        @NotNull LocalTime breakfastTime, @NotNull LocalTime lunchTime, @NotNull LocalTime dinnerTime,
        @NotNull LocalTime exerciseTime, @Min(10) @Max(90) int exerciseMinutes,
        @NotNull @Size(max=7) List<@Min(0) @Max(6) Integer> exerciseDays,
        @NotBlank @Size(max=1000) String experience, @Pattern(regexp="가볍게|보통") @NotNull String intensity,
        @NotNull @Size(max=1000) String preferences, @NotNull @Size(max=1000) String allergies,
        @NotNull @Size(max=1000) String limitations, @NotNull @Size(max=35) List<@Valid BusySlot> busySlots,
        boolean aiConsent, @Size(max=7) List<@NotNull @Valid ExerciseWindow> exerciseWindows, @Valid NutritionGoal nutritionGoal) {
    public Preferences {
        exerciseWindows = exerciseWindows == null ? List.of() : List.copyOf(exerciseWindows);
    }
    public Preferences(LocalDate weekStart,LocalTime wakeTime,LocalTime sleepTime,LocalTime breakfastTime,
            LocalTime lunchTime,LocalTime dinnerTime,LocalTime exerciseTime,int exerciseMinutes,List<Integer> exerciseDays,
            String experience,String intensity,String preferences,String allergies,String limitations,List<BusySlot> busySlots,boolean aiConsent) {
        this(weekStart,wakeTime,sleepTime,breakfastTime,lunchTime,dinnerTime,exerciseTime,exerciseMinutes,exerciseDays,
                experience,intensity,preferences,allergies,limitations,busySlots,aiConsent,List.of(),null);
    }
}
