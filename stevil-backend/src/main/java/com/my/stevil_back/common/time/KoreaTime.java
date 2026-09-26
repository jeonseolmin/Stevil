package com.my.stevil_back.common.time;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/*
 * 서비스의 "오늘/지금" 기준 시간대(Asia/Seoul).
 * 운영 컨테이너 JVM 은 UTC 라서 zone 없는 LocalDate.now()/LocalTime.now() 는 KST 00~09시에 전날·9시간 전으로 계산된다.
 * 사용자에게 의미 있는 날짜/시각 기본값은 여기서 얻는다. (저장용 타임스탬프 규칙 정리는 별도 작업)
 */
public final class KoreaTime {

    public static final ZoneId ZONE = ZoneId.of("Asia/Seoul");

    private KoreaTime() {
    }

    public static LocalDate today() {
        return today(Clock.systemUTC());
    }

    public static LocalDate today(Clock clock) {
        return LocalDate.now(clock.withZone(ZONE));
    }

    public static LocalTime now() {
        return now(Clock.systemUTC());
    }

    public static LocalTime now(Clock clock) {
        return LocalTime.now(clock.withZone(ZONE));
    }
}
