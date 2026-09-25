package com.my.stevil_back.reminder.service;

import com.my.stevil_back.notification.dto.response.NotificationResponse;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
import com.my.stevil_back.notification.service.UserNotificationService;
import com.my.stevil_back.reminder.config.ReminderProperties;
import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.ReminderDelivery;
import com.my.stevil_back.reminder.entity.enumType.DeliveryStatus;
import com.my.stevil_back.reminder.repository.ReminderDeliveryRepository;
import com.my.stevil_back.reminder.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;

/*
 * 리마인더 1건의 도래 회차를 처리한다. 호출마다 독립 트랜잭션이라 한 건의 실패가 다른 건을 막지 않는다.
 *
 *  1. 행 잠금(SKIP LOCKED) 후 아직 도래 상태인지 다시 확인
 *  2. 정지 계정 -> SKIPPED_SUSPENDED(Notification 없음), grace 초과 -> SKIPPED_MISSED, 그 외 SENT
 *  3. SENT 이면 UserNotificationService.create -> 커밋 후(AFTER_COMMIT) @Async 로 FCM push (PR-A/B 흐름 그대로)
 *  4. nextFireAt 을 now 이후로 전진 — 밀린 회차를 몰아서 보내지 않는다(리마인더당 tick 마다 최대 1건)
 *
 * Notification 생성이 실패하면 delivery 도 같이 롤백되어 다음 tick 에 재시도된다(grace 가 지나면 SKIPPED_MISSED 로 정리).
 */
@Component
@RequiredArgsConstructor
public class ReminderDeliveryProcessor {

    private final ReminderRepository reminderRepository;
    private final ReminderDeliveryRepository deliveryRepository;
    private final UserNotificationService notificationService;
    private final ReminderScheduleCalculator calculator;
    private final ReminderProperties properties;

    /** 처리한 상태를 돌려준다. 이미 처리됐거나(다른 인스턴스/중복 호출) 도래하지 않았으면 null. */
    @Transactional
    public DeliveryStatus process(Long reminderId, Instant now) {
        Reminder reminder = reminderRepository.findByIdForUpdate(reminderId).orElse(null);

        if (reminder == null || !reminder.isEnabled()
                || reminder.getNextFireAt() == null || reminder.getNextFireAt().isAfter(now)) {
            return null;
        }

        Instant fireAt = reminder.getNextFireAt();
        ZonedDateTime local = fireAt.atZone(reminder.zone());
        DeliveryStatus status = null;

        if (!deliveryRepository.existsOccurrence(reminder.getId(), local.toLocalDate(), local.toLocalTime())) {
            status = decide(reminder, fireAt, now);

            ReminderDelivery delivery = deliveryRepository.saveAndFlush(new ReminderDelivery(
                    reminder, local.toLocalDate(), local.toLocalTime(), status, now));

            if (status == DeliveryStatus.SENT) {
                NotificationResponse notification = notificationService.create(
                        reminder.getUser().getId(),
                        NotificationType.REMINDER,
                        reminder.getType().title(reminder.getMealType()),
                        body(reminder, local),
                        reminder.getType().targetUrl()
                );
                delivery.linkNotification(notification.id());
            }
        }

        reminder.scheduleNext(calculator.next(reminder, now));
        return status;
    }

    private DeliveryStatus decide(Reminder reminder, Instant fireAt, Instant now) {
        if (reminder.getUser().isSuspended()) {
            return DeliveryStatus.SKIPPED_SUSPENDED;
        }
        if (Duration.between(fireAt, now).compareTo(Duration.ofMinutes(properties.graceMinutes())) > 0) {
            return DeliveryStatus.SKIPPED_MISSED;
        }
        return DeliveryStatus.SENT;
    }

    /** 사용자가 붙인 이름이 있으면 그것을, 없으면 예정 시각을 보여 준다. 용량 같은 건강 정보는 넣지 않는다. */
    private static String body(Reminder reminder, ZonedDateTime local) {
        if (reminder.getLabel() != null && !reminder.getLabel().isBlank()) {
            return reminder.getLabel();
        }
        return String.format("%02d:%02d 알림", local.getHour(), local.getMinute());
    }
}
