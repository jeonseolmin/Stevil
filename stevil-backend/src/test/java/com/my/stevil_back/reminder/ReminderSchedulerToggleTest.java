package com.my.stevil_back.reminder;

import com.my.stevil_back.reminder.repository.ReminderDeliveryRepository;
import com.my.stevil_back.reminder.repository.ReminderPlannerSlotRepository;
import com.my.stevil_back.reminder.repository.ReminderRepository;
import com.my.stevil_back.reminder.service.ReminderDeliveryProcessor;
import com.my.stevil_back.reminder.service.ReminderScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/* 운영 배포 직후 스케줄러가 저절로 돌지 않도록 기본은 꺼져 있고, 명시적으로 켰을 때만 빈이 생긴다. */
class ReminderSchedulerToggleTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withBean(ReminderRepository.class, () -> mock(ReminderRepository.class))
            .withBean(ReminderDeliveryRepository.class, () -> mock(ReminderDeliveryRepository.class))
            .withBean(ReminderPlannerSlotRepository.class, () -> mock(ReminderPlannerSlotRepository.class))
            .withBean(ReminderDeliveryProcessor.class, () -> mock(ReminderDeliveryProcessor.class))
            .withUserConfiguration(ReminderScheduler.class);

    @Test
    void offByDefault() {
        runner.run(context -> assertThat(context).doesNotHaveBean(ReminderScheduler.class));
    }

    @Test
    void onWhenExplicitlyEnabled() {
        runner.withPropertyValues("stevil.reminder.scheduler.enabled=true")
                .run(context -> assertThat(context).hasSingleBean(ReminderScheduler.class));
    }
}
