package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record Preferences(

        @NotNull
        LocalDate weekStart,

        @NotNull
        LocalTime wakeTime,

        @NotNull
        LocalTime sleepTime,

        @NotNull
        LocalTime breakfastTime,

        @NotNull
        LocalTime lunchTime,

        @NotNull
        LocalTime dinnerTime,

        @NotNull
        LocalTime exerciseTime,

        @Min(10)
        @Max(90)
        int exerciseMinutes,

        @NotNull
        @Size(max = 7)
        List<
                @Min(0)
                @Max(6)
                        Integer
                > exerciseDays,

        @NotBlank
        @Size(max = 1000)
        String experience,

        @Pattern(regexp = "가볍게|보통")
        @NotNull
        String intensity,

        @NotNull
        @Size(max = 1000)
        String preferences,

        @NotNull
        @Size(max = 1000)
        String allergies,

        @NotNull
        @Size(max = 1000)
        String limitations,

        @NotNull
        @Size(max = 35)
        List<@Valid BusySlot> busySlots,

        boolean aiConsent,

        @Size(max = 7)
        List<
                @NotNull
                @Valid
                        ExerciseWindow
                > exerciseWindows,

        @Valid
        NutritionGoal nutritionGoal
) {

    /**
     * compact constructor
     *
     * exerciseWindows가 null로 들어오면
     * 빈 리스트로 변환해서 이후 코드에서
     * null 체크를 반복하지 않도록 한다.
     */
    public Preferences {

        exerciseWindows =
                exerciseWindows == null
                        ? List.of()
                        : List.copyOf(exerciseWindows);
    }

    /**
     * 기존 코드 호환용 생성자.
     *
     * exerciseWindows와 nutritionGoal이 없던
     * 기존 호출부에서 그대로 사용할 수 있다.
     */
    public Preferences(
            LocalDate weekStart,
            LocalTime wakeTime,
            LocalTime sleepTime,
            LocalTime breakfastTime,
            LocalTime lunchTime,
            LocalTime dinnerTime,
            LocalTime exerciseTime,
            int exerciseMinutes,
            List<Integer> exerciseDays,
            String experience,
            String intensity,
            String preferences,
            String allergies,
            String limitations,
            List<BusySlot> busySlots,
            boolean aiConsent
    ) {
        this(
                weekStart,
                wakeTime,
                sleepTime,
                breakfastTime,
                lunchTime,
                dinnerTime,
                exerciseTime,
                exerciseMinutes,
                exerciseDays,
                experience,
                intensity,
                preferences,
                allergies,
                limitations,
                busySlots,
                aiConsent,
                List.of(),
                null
        );
    }

    /**
     * 기존 Preferences 정보는 그대로 유지하면서
     * nutritionGoal만 새 값으로 교체한다.
     *
     * PlannerService에서 Diet의 UserDietGoal을
     * Planner용 NutritionGoal로 변환한 뒤
     * 이 메서드를 사용한다.
     */
    public Preferences withNutritionGoal(
            NutritionGoal goal
    ) {

        return new Preferences(
                weekStart,
                wakeTime,
                sleepTime,
                breakfastTime,
                lunchTime,
                dinnerTime,
                exerciseTime,
                exerciseMinutes,
                exerciseDays,
                experience,
                intensity,
                preferences,
                allergies,
                limitations,
                busySlots,
                aiConsent,
                exerciseWindows,
                goal
        );
    }
}