package com.my.stevil_back.reminder.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/*
 * graceMinutes: 예정 시각에서 이 시간 이내로 늦게 처리되면 그대로 보내고, 넘기면 SKIPPED_MISSED 로 기록만 한다.
 * scheduler.enabled(STEVIL_REMINDER_SCHEDULER_ENABLED, 기본 false)가 true 일 때만 ReminderScheduler 빈이 만들어진다.
 */
@ConfigurationProperties(prefix = "stevil.reminder")
public record ReminderProperties(
        @DefaultValue("10") int graceMinutes
) {
}
