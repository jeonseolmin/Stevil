package com.my.stevil_back.reminder;

import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.ReminderPlannerSlot;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static com.my.stevil_back.reminder.service.ReminderScheduleCalculator.bit;
import static com.my.stevil_back.reminder.service.ReminderScheduleCalculator.nextPlanned;
import static com.my.stevil_back.reminder.service.ReminderScheduleCalculator.nextWeekly;
import static org.assertj.core.api.Assertions.assertThat;

class ReminderScheduleCalculatorTest {

    static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    static final ZoneId NEW_YORK = ZoneId.of("America/New_York");
    static final int EVERY_DAY = 0x7F;

    static Instant at(ZoneId zone, int y, int m, int d, int h, int min) {
        return ZonedDateTime.of(y, m, d, h, min, 0, 0, zone).toInstant();
    }

    @Test
    void sameDayLaterTimeFiresToday() {
        // 2026-09-28 은 월요일
        Instant after = at(SEOUL, 2026, 9, 28, 7, 0);
        assertThat(nextWeekly(LocalTime.of(8, 0), EVERY_DAY, SEOUL, after)).isEqualTo(at(SEOUL, 2026, 9, 28, 8, 0));
    }

    @Test
    void resultIsStrictlyAfter() {
        Instant after = at(SEOUL, 2026, 9, 28, 8, 0);
        assertThat(nextWeekly(LocalTime.of(8, 0), EVERY_DAY, SEOUL, after)).isEqualTo(at(SEOUL, 2026, 9, 29, 8, 0));
    }

    @Test
    void dayMaskSkipsToNextSelectedDayAndWrapsWeek() {
        int mondayOnly = bit(DayOfWeek.MONDAY);
        Instant mondayAfterTime = at(SEOUL, 2026, 9, 28, 9, 0);
        assertThat(nextWeekly(LocalTime.of(8, 0), mondayOnly, SEOUL, mondayAfterTime))
                .isEqualTo(at(SEOUL, 2026, 10, 5, 8, 0));

        int friday = bit(DayOfWeek.FRIDAY);
        assertThat(nextWeekly(LocalTime.of(20, 0), friday, SEOUL, mondayAfterTime))
                .isEqualTo(at(SEOUL, 2026, 10, 2, 20, 0));
    }

    @Test
    void midnightRolloverUsesLocalDateOfZone() {
        // 서울 23:59 -> 다음 날 00:00
        Instant after = at(SEOUL, 2026, 9, 28, 23, 59);
        assertThat(nextWeekly(LocalTime.MIDNIGHT, EVERY_DAY, SEOUL, after)).isEqualTo(at(SEOUL, 2026, 9, 29, 0, 0));
    }

    @Test
    void emptyMaskOrNoTimeHasNoNext() {
        Instant after = at(SEOUL, 2026, 9, 28, 7, 0);
        assertThat(nextWeekly(LocalTime.of(8, 0), 0, SEOUL, after)).isNull();
        assertThat(nextWeekly(null, EVERY_DAY, SEOUL, after)).isNull();
    }

    @Test
    void sameLocalTimeDiffersByZone() {
        Instant after = at(SEOUL, 2026, 9, 28, 0, 0);
        Instant seoul = nextWeekly(LocalTime.of(9, 0), EVERY_DAY, SEOUL, after);
        Instant newYork = nextWeekly(LocalTime.of(9, 0), EVERY_DAY, NEW_YORK, after);
        assertThat(seoul.atZone(SEOUL).toLocalTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(newYork.atZone(NEW_YORK).toLocalTime()).isEqualTo(LocalTime.of(9, 0));
        assertThat(seoul).isNotEqualTo(newYork);
    }

    @Test
    void dstGapShiftsForwardAndOverlapUsesEarlierOffset() {
        // 2027-03-14 02:30 은 뉴욕에 존재하지 않는다 -> 03:30 EDT
        Instant beforeGap = at(NEW_YORK, 2027, 3, 14, 0, 0);
        Instant gap = nextWeekly(LocalTime.of(2, 30), EVERY_DAY, NEW_YORK, beforeGap);
        assertThat(gap.atZone(NEW_YORK).toLocalTime()).isEqualTo(LocalTime.of(3, 30));

        // 2027-11-07 01:30 은 두 번 있다 -> 이른 쪽(EDT, UTC-4) 한 번만
        Instant beforeOverlap = at(NEW_YORK, 2027, 11, 7, 0, 0);
        Instant overlap = nextWeekly(LocalTime.of(1, 30), EVERY_DAY, NEW_YORK, beforeOverlap);
        assertThat(overlap).isEqualTo(Instant.parse("2027-11-07T05:30:00Z"));
        assertThat(nextWeekly(LocalTime.of(1, 30), EVERY_DAY, NEW_YORK, overlap))
                .isEqualTo(Instant.parse("2027-11-08T06:30:00Z"));
    }

    @Test
    void plannedSlotsKeepPerDateTimesAndOverrideReplacesTime() {
        Reminder r = Reminder.ofPlanner(null, null, null, "PLANNER:MEAL:1");
        List<ReminderPlannerSlot> slots = List.of(
                new ReminderPlannerSlot(r, LocalDate.of(2026, 9, 30), LocalTime.of(12, 0)), // 수
                new ReminderPlannerSlot(r, LocalDate.of(2026, 10, 1), LocalTime.of(13, 0))  // 목
        );

        Instant wedAfterLunch = at(SEOUL, 2026, 9, 30, 12, 30);
        assertThat(nextPlanned(slots, null, SEOUL, wedAfterLunch)).isEqualTo(at(SEOUL, 2026, 10, 1, 13, 0));
        assertThat(nextPlanned(slots, LocalTime.of(11, 0), SEOUL, wedAfterLunch)).isEqualTo(at(SEOUL, 2026, 10, 1, 11, 0));

        Instant afterAll = at(SEOUL, 2026, 10, 1, 13, 0);
        assertThat(nextPlanned(slots, null, SEOUL, afterAll)).isNull();
    }
}
