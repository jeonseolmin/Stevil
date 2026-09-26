package com.my.stevil_back.common.time;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
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

    @Test
    void serverTimestampsAreShownInKoreaTime() {
        LocalDateTime storedUtc = LocalDateTime.of(2026, 9, 26, 4, 48, 29);

        assertThat(KoreaTime.fromServer(storedUtc, ZoneOffset.UTC)).isEqualTo(LocalDateTime.of(2026, 9, 26, 13, 48, 29));
        assertThat(KoreaTime.fromServer(storedUtc, ZoneId.of("Asia/Seoul"))).isEqualTo(storedUtc); // KST 개발 PC
        assertThat(KoreaTime.fromServer(LocalDateTime.of(2026, 9, 26, 16, 0), ZoneOffset.UTC).toLocalDate())
                .isEqualTo(LocalDate.of(2026, 9, 27)); // 날짜만 보여 주는 화면도 KST 날짜
        assertThat(KoreaTime.fromServer(null)).isNull();
    }

    @Test
    void koreaDayBoundaryMapsToServerZoneForQueries() {
        LocalDateTime kstMidnight = LocalDateTime.of(2026, 9, 26, 0, 0);

        assertThat(KoreaTime.toServer(kstMidnight, ZoneOffset.UTC)).isEqualTo(LocalDateTime.of(2026, 9, 25, 15, 0));
        assertThat(KoreaTime.toServer(kstMidnight, ZoneId.of("Asia/Seoul"))).isEqualTo(kstMidnight);
        assertThat(KoreaTime.fromServer(KoreaTime.toServer(kstMidnight, ZoneOffset.UTC), ZoneOffset.UTC)).isEqualTo(kstMidnight);
    }
}
