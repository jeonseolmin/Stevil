package com.my.stevil_back.reminder.service;

import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.ReminderPlannerSlot;
import com.my.stevil_back.reminder.repository.ReminderPlannerSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

/*
 * 다음 발생 시각 계산. 결과는 항상 after 보다 "엄격히" 뒤인 첫 시각(UTC Instant)이며 없으면 null.
 * 로컬 시각 -> Instant 변환은 ZonedDateTime.of 규칙을 따른다: DST gap 이면 gap 길이만큼 뒤로, overlap 이면 이른 offset.
 */
@Component
@RequiredArgsConstructor
public class ReminderScheduleCalculator {

    private final ReminderPlannerSlotRepository slotRepository;

    /** 리마인더 종류에 맞춰 다음 시각을 계산한다. 비활성이면 null. */
    public Instant next(Reminder reminder, Instant after) {
        if (!reminder.isEnabled()) {
            return null;
        }
        ZoneId zone = reminder.zone();

        if (!reminder.isPlanner()) {
            return nextWeekly(reminder.getScheduledTime(), reminder.daysMask(), zone, after);
        }

        // 하루 전부터 본다: timezone 차이로 after 의 로컬 날짜보다 이른 날짜의 슬롯이 아직 미래일 수 있다.
        LocalDate from = after.atZone(zone).toLocalDate().minusDays(1);
        List<ReminderPlannerSlot> slots = slotRepository.findFrom(reminder.getId(), from);
        return nextPlanned(slots, reminder.getTimeOverride(), zone, after);
    }

    public static Instant nextWeekly(LocalTime time, int daysMask, ZoneId zone, Instant after) {
        if (time == null || (daysMask & 0x7F) == 0) {
            return null;
        }
        LocalDate date = after.atZone(zone).toLocalDate();

        // 8일째까지 보면 오늘 시각이 이미 지난 경우(같은 요일 다음 주)도 포함된다.
        for (int i = 0; i <= 7; i++) {
            LocalDate candidateDate = date.plusDays(i);
            if (!hasDay(daysMask, candidateDate.getDayOfWeek())) {
                continue;
            }
            Instant candidate = ZonedDateTime.of(candidateDate, time, zone).toInstant();
            if (candidate.isAfter(after)) {
                return candidate;
            }
        }
        return null;
    }

    public static Instant nextPlanned(List<ReminderPlannerSlot> slots, LocalTime override, ZoneId zone, Instant after) {
        Instant best = null;
        for (ReminderPlannerSlot slot : slots) {
            LocalTime time = override != null ? override : slot.getPlannedTime();
            Instant candidate = ZonedDateTime.of(slot.getPlanDate(), time, zone).toInstant();
            if (candidate.isAfter(after) && (best == null || candidate.isBefore(best))) {
                best = candidate;
            }
        }
        return best;
    }

    public static boolean hasDay(int daysMask, DayOfWeek day) {
        return (daysMask & bit(day)) != 0;
    }

    public static int bit(DayOfWeek day) {
        return 1 << (day.getValue() - 1);
    }
}
