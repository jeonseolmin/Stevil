package com.my.stevil_back.reminder.service;

import com.my.stevil_back.reminder.repository.ReminderDeliveryRepository;
import com.my.stevil_back.reminder.repository.ReminderPlannerSlotRepository;
import com.my.stevil_back.reminder.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/*
 * 1분 주기로 nextFireAt <= now 인 리마인더만 조회해 1건씩 독립 트랜잭션으로 처리한다.
 * stevil.reminder.scheduler.enabled=true 일 때만 이 빈(스케줄 포함)이 만들어진다(기본 false, 운영 검증 후 명시적으로 켠다).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "stevil.reminder.scheduler", name = "enabled", havingValue = "true")
public class ReminderScheduler {

    static final int BATCH_SIZE = 100;
    static final int MAX_BATCHES_PER_TICK = 10;
    static final int DELIVERY_RETENTION_DAYS = 60;
    static final int SLOT_RETENTION_DAYS = 14;

    private final ReminderRepository reminderRepository;
    private final ReminderDeliveryRepository deliveryRepository;
    private final ReminderPlannerSlotRepository slotRepository;
    private final ReminderDeliveryProcessor processor;

    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void tick() {
        runOnce(Instant.now());
    }

    /** 처리 시도한 리마인더 수. 한 건의 예외는 로그만 남기고 다음 건으로 넘어간다. */
    public int runOnce(Instant now) {
        int processed = 0;
        Instant afterFireAt = Instant.EPOCH;
        Long afterId = 0L;

        for (int batch = 0; batch < MAX_BATCHES_PER_TICK; batch++) {
            List<ReminderRepository.Due> due =
                    reminderRepository.findDue(now, afterFireAt, afterId, PageRequest.of(0, BATCH_SIZE));

            for (ReminderRepository.Due reminder : due) {
                try {
                    processor.process(reminder.getId(), now);
                } catch (Exception e) {
                    log.warn("Reminder delivery failed, will retry next tick: reminderId={}, error={}",
                            reminder.getId(), e.getClass().getSimpleName());
                }
                processed++;
            }

            if (due.size() < BATCH_SIZE) {
                break;
            }
            // 실패/잠김으로 nextFireAt 이 그대로인 행도 다시 읽지 않도록 커서를 앞으로 옮긴다.
            ReminderRepository.Due last = due.get(due.size() - 1);
            afterFireAt = last.getNextFireAt();
            afterId = last.getId();
        }
        return processed;
    }

    /** 하루 1회 보관 기간이 지난 회차 기록과 지난 계획 슬롯을 지운다. Notification 은 건드리지 않는다. */
    @Scheduled(cron = "0 30 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void cleanup() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        int deliveries = deliveryRepository.deleteOlderThan(today.minusDays(DELIVERY_RETENTION_DAYS));
        int slots = slotRepository.deleteOlderThan(today.minusDays(SLOT_RETENTION_DAYS));
        log.info("Reminder cleanup: deliveries={}, plannerSlots={}", deliveries, slots);
    }
}
