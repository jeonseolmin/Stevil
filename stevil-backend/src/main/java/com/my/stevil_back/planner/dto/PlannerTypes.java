package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public final class PlannerTypes {
    private PlannerTypes() {}
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
    public record ExerciseWindow(@Min(0) @Max(6) int day, @NotNull LocalTime start, @NotNull LocalTime end) {}
    public record NutritionGoal(@DecimalMin("20") @DecimalMax("350") double weightKg,
            @DecimalMin("0.1") @DecimalMax("3") double proteinPerKg,
            @Min(1000) @Max(5000) int calories, boolean confirmed) {}
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
    public record FoodComponent(@NotBlank @Size(max=80) String foodId, @NotBlank @Size(max=300) String name,
            @NotNull @Pattern(regexp="staple|protein|vegetable|snack") String role,
            @NotNull @Pattern(regexp="https://www\\.data\\.go\\.kr/data/15127578/openapi\\.do") String sourceUrl,
            @NotNull @Size(max=80) String retrievedAt,
            @NotNull @Pattern(regexp="[0-9]+(?:\\.[0-9]+)?") @Size(max=20) String basisWeight,
            @NotNull @Pattern(regexp="[0-9]+(?:\\.[0-9]+)?") @Size(max=20) String servingWeight,
            @NotNull @Size(max=5) Map<@Size(max=20) String, @Size(max=100) String> nutrition,
            @NotNull @Pattern(regexp="[a-f0-9]{64}") String fingerprint,
            @NotNull @Size(max=5) Map<@Size(max=20) String, @Size(max=100) String> amountNutrition) {}
    public record FoodEvidence(@NotBlank @Size(max=80) String recipeId,
            @Pattern(regexp="https://(?:www\\.foodsafetykorea\\.go\\.kr/api/openApiInfo\\.do\\?menu_no=661&svc_no=COOKRCP01|www\\.data\\.go\\.kr/data/15127578/openapi\\.do)") @NotNull String sourceUrl,
            @NotNull @Size(max=80) String retrievedAt, @NotNull @Size(max=10000) String ingredients,
            @NotNull @Size(max=100) String servingWeight,
            @NotNull @Size(max=5) Map<@Size(max=20) String, @Size(max=100) String> nutrition,
            @NotNull @Pattern(regexp="[a-f0-9]{64}") String fingerprint,
            @Size(max=3) List<@NotNull @Valid FoodComponent> components) {
        public FoodEvidence {
            components = components == null ? List.of() : List.copyOf(components);
        }
        public FoodEvidence(String recipeId,String sourceUrl,String retrievedAt,String ingredients,String servingWeight,
                Map<String,String> nutrition,String fingerprint) {
            this(recipeId,sourceUrl,retrievedAt,ingredients,servingWeight,nutrition,fingerprint,List.of());
        }
    }
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

    public record Event(@NotBlank @Size(max=80) String id, @NotNull @Pattern(regexp="MEAL|EXERCISE|SNACK") String kind,
            @NotBlank @Size(max=60) String title, @NotNull @Size(max=500) String details,
            @NotNull LocalDateTime start, @NotNull LocalDateTime end,
            @NotNull @Pattern(regexp="|가볍게|보통") String intensity, boolean completed, @Valid FoodEvidence foodEvidence,
            @Size(max=100) String exerciseId, @Size(max=100) String exerciseCategory,
            @Size(max=100) String exerciseDifficulty, @Size(max=300) String exerciseEquipment,
            @Size(max=100) String exerciseImpact,
            @Size(max=5) List<@NotNull @Valid ExerciseEvidence> exerciseEvidence) {
        public Event {
            exerciseEvidence = exerciseEvidence == null ? List.of() : List.copyOf(exerciseEvidence);
        }
        public Event(String id,String kind,String title,String details,LocalDateTime start,LocalDateTime end,
                     String intensity,boolean completed,FoodEvidence foodEvidence) {
            this(id,kind,title,details,start,end,intensity,completed,foodEvidence,null,null,null,null,null,List.of());
        }
        public Event(String id,String kind,String title,String details,LocalDateTime start,LocalDateTime end,String intensity,boolean completed) {
            this(id,kind,title,details,start,end,intensity,completed,null);
        }
    }
    public record Draft(@NotNull @Size(max=64) List<@Valid Event> events, List<String> notices, String mode) {}
    public record Save(@Min(0) long revision, @NotNull @Valid Preferences preferences,
                       @NotNull @Size(max=64) List<@Valid Event> events) {}
    public record Saved(long revision, Preferences preferences, List<Event> events) {}
}
