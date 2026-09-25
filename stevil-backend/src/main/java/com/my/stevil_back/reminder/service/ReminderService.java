package com.my.stevil_back.reminder.service;

import com.my.stevil_back.reminder.dto.ReminderRequests;
import com.my.stevil_back.reminder.dto.ReminderResponse;
import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.ReminderPlannerSlot;
import com.my.stevil_back.reminder.entity.enumType.MealType;
import com.my.stevil_back.reminder.entity.enumType.ReminderSource;
import com.my.stevil_back.reminder.entity.enumType.ReminderType;
import com.my.stevil_back.reminder.repository.ReminderPlannerSlotRepository;
import com.my.stevil_back.reminder.repository.ReminderRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/*
 * 로그인 사용자의 리마인더 CRUD. userId 는 항상 인증 정보에서 오고, 남의 리마인더는 404 로 숨긴다.
 * 생성/수정/켜기 시 nextFireAt 은 "지금 이후" 로만 다시 계산하므로 과거 회차가 뒤늦게 발송되지 않는다.
 */
@Service
@RequiredArgsConstructor
public class ReminderService {

    public static final int USER_REMINDER_LIMIT = 20;
    private static final int PLANNED_SLOT_DAYS = 7;

    private final ReminderRepository reminderRepository;
    private final ReminderPlannerSlotRepository slotRepository;
    private final UserRepository userRepository;
    private final ReminderScheduleCalculator calculator;

    @Transactional(readOnly = true)
    public List<ReminderResponse> list(Long userId) {
        return reminderRepository.findAllByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ReminderResponse create(Long userId, ReminderRequests.Create request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));

        validateUserSchedule(request.type(), request.mealType(), request.daysOfWeek());
        String timezone = timezone(request.timezone());
        String label = label(request.label());
        int mask = mask(request.daysOfWeek());

        List<Reminder> existing = reminderRepository.findByUserIdAndSource(userId, ReminderSource.USER);
        if (existing.size() >= USER_REMINDER_LIMIT) {
            throw bad("리마인더는 최대 " + USER_REMINDER_LIMIT + "개까지 만들 수 있습니다.");
        }
        rejectDuplicate(existing, null, request.type(), request.mealType(), request.scheduledTime(), mask);

        Reminder reminder = Reminder.ofUser(user, request.type(), request.mealType(), request.scheduledTime(),
                mask, timezone, label, request.enabled() == null || request.enabled());
        reminder.scheduleNext(calculator.next(reminder, Instant.now()));

        return toResponse(reminderRepository.save(reminder));
    }

    @Transactional
    public ReminderResponse update(Long userId, Long id, ReminderRequests.Update request) {
        Reminder reminder = find(userId, id);

        if (reminder.isPlanner()) {
            if (request.type() != null || request.mealType() != null
                    || request.scheduledTime() != null || request.daysOfWeek() != null) {
                throw bad("계획에서 만든 리마인더는 시각(timeOverride), 이름, 시간대만 바꿀 수 있습니다.");
            }
            reminder.changeTimeOverride(request.timeOverride());
        } else {
            if (request.timeOverride() != null) {
                throw bad("timeOverride 는 계획에서 만든 리마인더에만 쓸 수 있습니다.");
            }
            ReminderType type = request.type() != null ? request.type() : reminder.getType();
            // 종류를 바꾸면 식사 종류도 새로 받는다(MEAL 이 아니면 null).
            MealType mealType = request.mealType() != null ? request.mealType()
                    : request.type() != null ? null : reminder.getMealType();
            LocalTime time = request.scheduledTime() != null ? request.scheduledTime() : reminder.getScheduledTime();
            List<DayOfWeek> days = request.daysOfWeek() != null ? request.daysOfWeek() : days(reminder.daysMask());

            validateUserSchedule(type, mealType, days);
            int mask = mask(days);
            rejectDuplicate(reminderRepository.findByUserIdAndSource(userId, ReminderSource.USER),
                    reminder.getId(), type, mealType, time, mask);
            reminder.updateUserSchedule(type, mealType, time, mask);
        }

        if (request.timezone() != null) {
            reminder.changeTimezone(timezone(request.timezone()));
        }
        if (request.label() != null) {
            reminder.changeLabel(label(request.label()));
        }

        reminder.scheduleNext(calculator.next(reminder, Instant.now()));
        return toResponse(reminder);
    }

    @Transactional
    public ReminderResponse setEnabled(Long userId, Long id, boolean enabled) {
        Reminder reminder = find(userId, id);
        reminder.changeEnabled(enabled);
        reminder.scheduleNext(calculator.next(reminder, Instant.now()));
        return toResponse(reminder);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Reminder reminder = find(userId, id);
        if (reminder.isPlanner()) {
            throw bad("계획에서 만든 리마인더는 삭제할 수 없습니다. 대신 끌 수 있습니다.");
        }
        reminderRepository.delete(reminder);
    }

    private Reminder find(Long userId, Long id) {
        return reminderRepository.findByIdAndUserIdForUpdate(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "리마인더를 찾을 수 없습니다."));
    }

    private ReminderResponse toResponse(Reminder reminder) {
        if (!reminder.isPlanner()) {
            return ReminderResponse.of(reminder, List.of());
        }
        LocalDate today = LocalDate.now(reminder.zone());
        List<ReminderPlannerSlot> slots = slotRepository.findFrom(reminder.getId(), today).stream()
                .filter(s -> s.getPlanDate().isBefore(today.plusDays(PLANNED_SLOT_DAYS)))
                .toList();
        return ReminderResponse.of(reminder, slots);
    }

    /** 시간대로 식사 종류를 추정하지 않으므로 USER MEAL 은 mealType 을 반드시 받는다. */
    private static void validateUserSchedule(ReminderType type, MealType mealType, List<DayOfWeek> days) {
        if (type == ReminderType.HOSPITAL) {
            throw bad("병원 방문 알림은 아직 만들 수 없습니다.");
        }
        if (type == ReminderType.MEAL && mealType == null) {
            throw bad("식사 알림은 식사 종류(mealType)가 필요합니다.");
        }
        if (type != ReminderType.MEAL && mealType != null) {
            throw bad("식사 종류(mealType)는 식사 알림에만 지정할 수 있습니다.");
        }
        if (days == null || days.isEmpty() || days.stream().anyMatch(Objects::isNull)) {
            throw bad("요일을 하나 이상 선택해 주세요.");
        }
    }

    private static void rejectDuplicate(List<Reminder> existing, Long selfId, ReminderType type,
                                        MealType mealType, LocalTime time, int mask) {
        boolean duplicate = existing.stream().anyMatch(r -> !r.getId().equals(selfId)
                && r.getType() == type
                && r.getMealType() == mealType
                && Objects.equals(r.getScheduledTime(), time)
                && r.daysMask() == mask);
        if (duplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "같은 리마인더가 이미 있습니다.");
        }
    }

    /** IANA 지역 ID 만 허용한다("+09:00" 같은 고정 offset 은 DST 를 표현하지 못한다). */
    static String timezone(String timezone) {
        if (timezone == null || timezone.isBlank()) {
            return Reminder.DEFAULT_TIMEZONE;
        }
        if (!ZoneId.getAvailableZoneIds().contains(timezone)) {
            throw bad("지원하지 않는 시간대입니다.");
        }
        return timezone;
    }

    private static String label(String label) {
        if (label == null || label.isBlank()) {
            return null;
        }
        String trimmed = label.strip();
        if (trimmed.length() > Reminder.LABEL_MAX_LENGTH) {
            throw bad("이름은 " + Reminder.LABEL_MAX_LENGTH + "자를 넘을 수 없습니다.");
        }
        return trimmed;
    }

    private static int mask(List<DayOfWeek> days) {
        int mask = 0;
        for (DayOfWeek day : days) {
            mask |= ReminderScheduleCalculator.bit(day);
        }
        return mask;
    }

    private static List<DayOfWeek> days(int mask) {
        return Arrays.stream(DayOfWeek.values())
                .filter(day -> ReminderScheduleCalculator.hasDay(mask, day))
                .toList();
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
