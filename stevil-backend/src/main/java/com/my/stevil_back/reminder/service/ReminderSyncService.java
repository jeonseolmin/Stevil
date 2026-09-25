package com.my.stevil_back.reminder.service;

import com.my.stevil_back.planner.dto.Event;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/*
 * 저장된 주간 계획 -> PLANNER 리마인더 동기화.
 *
 *  - identity: sourceKey = PLANNER:{KIND}:{ordinal}. ordinal 은 하루 안에서 같은 kind 이벤트를 (start, end, title) 순으로
 *    정렬한 1-based 순번이다. Planner Event.id 는 저장마다 새 uuid 라 쓰지 않고, 시각 값도 key 에 넣지 않는다
 *    (시각이 바뀌면 같은 리마인더의 슬롯만 바뀐다).
 *  - 요일마다 시각이 달라도 합치지 않고 날짜별 실제 시각을 슬롯으로 저장한다.
 *  - 그 주(월~일)의 슬롯만 전체 교체한다. 다른 주, 사용자 enabled/timeOverride 는 건드리지 않는다.
 *  - 순번이 사라진 리마인더는 지우지 않고 남은 슬롯이 없으면 휴면(nextFireAt=null).
 *  - 이번 주보다 이전 주의 저장은 무시한다.
 *
 * AFTER_COMMIT 리스너에서 불리므로 반드시 새 트랜잭션(REQUIRES_NEW)이어야 실제로 커밋된다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderSyncService {

    static final Map<String, Integer> ORDINAL_LIMITS = Map.of("MEAL", 6, "SNACK", 4, "EXERCISE", 2);
    private static final ZoneId PLAN_ZONE = ZoneId.of(Reminder.DEFAULT_TIMEZONE);

    private final ReminderRepository reminderRepository;
    private final ReminderPlannerSlotRepository slotRepository;
    private final UserRepository userRepository;
    private final ReminderScheduleCalculator calculator;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sync(Long userId, LocalDate weekStart, List<Event> events) {
        LocalDate weekMonday = weekStart.with(DayOfWeek.MONDAY);
        LocalDate thisMonday = LocalDate.now(PLAN_ZONE).with(DayOfWeek.MONDAY);
        if (weekMonday.isBefore(thisMonday)) {
            return;
        }
        LocalDate weekSunday = weekMonday.plusDays(6);

        // 같은 사용자의 동시 저장/동기화를 직렬화한다(Planner 저장과 같은 잠금).
        User user = userRepository.findByIdForUpdate(userId).orElse(null);
        if (user == null) {
            return;
        }

        Map<String, List<LocalDateTime>> planned = slotsByKey(events, weekMonday, weekSunday);

        Map<String, Reminder> reminders = reminderRepository.findByUserIdAndSourceForUpdate(userId, ReminderSource.PLANNER)
                .stream()
                .collect(Collectors.toMap(Reminder::getSourceKey, Function.identity()));

        if (!reminders.isEmpty()) {
            slotRepository.deleteWeek(reminders.values().stream().map(Reminder::getId).toList(), weekMonday, weekSunday);
        }

        planned.forEach((key, times) -> {
            Reminder reminder = reminders.computeIfAbsent(key, k -> reminderRepository.save(newReminder(user, k)));
            for (LocalDateTime time : times) {
                slotRepository.save(new ReminderPlannerSlot(reminder, time.toLocalDate(), time.toLocalTime()));
            }
        });

        Instant now = Instant.now();
        for (Reminder reminder : reminders.values()) {
            reminder.scheduleNext(calculator.next(reminder, now));
        }
    }

    /** key -> 그 주의 날짜별 시작 시각(날짜당 1개). 순번 상한을 넘는 이벤트는 무시한다. */
    static Map<String, List<LocalDateTime>> slotsByKey(List<Event> events, LocalDate from, LocalDate to) {
        Map<String, List<LocalDateTime>> result = new LinkedHashMap<>();

        Map<String, List<Event>> byDayAndKind = events.stream()
                .filter(e -> e.start() != null && ORDINAL_LIMITS.containsKey(e.kind()))
                .filter(e -> !e.start().toLocalDate().isBefore(from) && !e.start().toLocalDate().isAfter(to))
                .collect(Collectors.groupingBy(e -> e.start().toLocalDate() + "|" + e.kind(),
                        LinkedHashMap::new, Collectors.toList()));

        byDayAndKind.values().forEach(sameDayKind -> {
            List<Event> sorted = sameDayKind.stream()
                    .sorted(Comparator.comparing(Event::start)
                            .thenComparing(Event::end, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(Event::title, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            String kind = sorted.get(0).kind();
            int limit = ORDINAL_LIMITS.get(kind);

            if (sorted.size() > limit) {
                log.info("Planner reminder ordinal limit exceeded, extra events ignored: kind={}, count={}",
                        kind, sorted.size());
            }
            for (int i = 0; i < Math.min(sorted.size(), limit); i++) {
                result.computeIfAbsent("PLANNER:" + kind + ":" + (i + 1), k -> new ArrayList<>())
                        .add(sorted.get(i).start());
            }
        });
        return result;
    }

    private static Reminder newReminder(User user, String sourceKey) {
        String kind = sourceKey.split(":")[1];
        return switch (kind) {
            case "MEAL" -> Reminder.ofPlanner(user, ReminderType.MEAL, null, sourceKey);
            case "SNACK" -> Reminder.ofPlanner(user, ReminderType.MEAL, MealType.SNACK, sourceKey);
            default -> Reminder.ofPlanner(user, ReminderType.EXERCISE, null, sourceKey);
        };
    }
}
