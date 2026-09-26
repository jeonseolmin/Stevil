package com.my.stevil_back.common.time;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/* 서버가 UTC 여도 "오늘/지금"은 KST 기준이어야 한다(특히 KST 00:00~08:59). */
class KoreaTimeTest {

    private static Clock at(String instant) {
        return Clock.fixed(Instant.parse(instant), ZoneOffset.UTC);
    }

    @Test
    void earlyMorningKstIsAlreadyTodayWhileUtcIsStillYesterday() {
        Clock clock = at("2026-09-25T23:30:00Z"); // KST 2026-09-26 08:30

        assertThat(LocalDate.now(clock)).isEqualTo(LocalDate.of(2026, 9, 25));
        assertThat(KoreaTime.today(clock)).isEqualTo(LocalDate.of(2026, 9, 26));
        assertThat(KoreaTime.now(clock)).isEqualTo(LocalTime.of(8, 30));
    }

    @Test
    void dayChangesAtKstMidnight() {
        assertThat(KoreaTime.today(at("2026-09-26T14:59:59Z"))).isEqualTo(LocalDate.of(2026, 9, 26));
        assertThat(KoreaTime.today(at("2026-09-26T15:00:00Z"))).isEqualTo(LocalDate.of(2026, 9, 27));
    }
}
