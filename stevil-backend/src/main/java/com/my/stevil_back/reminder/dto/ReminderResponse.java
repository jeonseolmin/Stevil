package com.my.stevil_back.reminder.dto;

import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.ReminderPlannerSlot;
import com.my.stevil_back.reminder.entity.enumType.MealType;
import com.my.stevil_back.reminder.entity.enumType.ReminderSource;
import com.my.stevil_back.reminder.entity.enumType.ReminderType;
import com.my.stevil_back.reminder.service.ReminderScheduleCalculator;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

/** nextFireAt 은 UTC. plannedSlots 는 PLANNER 리마인더의 앞으로 7일 계획(override 반영 전 계획 시각). */
public record ReminderResponse(
        Long id,
        ReminderType type,
        MealType mealType,
        ReminderSource source,
        String label,
        String timezone,
        boolean enabled,
        LocalTime scheduledTime,
        List<DayOfWeek> daysOfWeek,
        LocalTime timeOverride,
        List<PlannedSlot> plannedSlots,
        Instant nextFireAt
) {

    public record PlannedSlot(LocalDate date, LocalTime time) {
    }

    public static ReminderResponse of(Reminder r, List<ReminderPlannerSlot> slots) {
        return new ReminderResponse(
                r.getId(),
                r.getType(),
                r.getMealType(),
                r.getSource(),
                r.getLabel(),
                r.getTimezone(),
                r.isEnabled(),
                r.getScheduledTime(),
                r.isPlanner() ? List.of() : Arrays.stream(DayOfWeek.values())
                        .filter(day -> ReminderScheduleCalculator.hasDay(r.daysMask(), day))
                        .toList(),
                r.getTimeOverride(),
                slots.stream().map(s -> new PlannedSlot(s.getPlanDate(), s.getPlannedTime())).toList(),
                r.getNextFireAt()
        );
    }
}
