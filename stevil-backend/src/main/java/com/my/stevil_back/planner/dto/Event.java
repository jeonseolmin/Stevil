package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

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
