package com.my.stevil_back.reminder.dto;

import com.my.stevil_back.reminder.entity.enumType.MealType;
import com.my.stevil_back.reminder.entity.enumType.ReminderType;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

public final class ReminderRequests {

    private ReminderRequests() {
    }

    /** USER 리마인더 생성. scheduledTime 은 "HH:mm", daysOfWeek 는 ["MONDAY", ...]. timezone 생략 시 Asia/Seoul. */
    public record Create(
            @NotNull ReminderType type,
            MealType mealType,
            @NotNull LocalTime scheduledTime,
            @NotNull List<DayOfWeek> daysOfWeek,
            String timezone,
            String label,
            Boolean enabled
    ) {
    }

    /*
     * 부분 수정. null 인 필드는 그대로 둔다. 단 timeOverride 는 PLANNER 전용이며 값 그대로 반영된다
     * (null 이면 override 해제 = Planner 시각을 다시 따름).
     * PLANNER 리마인더에 type/mealType/scheduledTime/daysOfWeek 를 보내면 400.
     */
    public record Update(
            ReminderType type,
            MealType mealType,
            LocalTime scheduledTime,
            List<DayOfWeek> daysOfWeek,
            String timezone,
            String label,
            LocalTime timeOverride
    ) {
    }

    public record Enabled(@NotNull Boolean enabled) {
    }
}
