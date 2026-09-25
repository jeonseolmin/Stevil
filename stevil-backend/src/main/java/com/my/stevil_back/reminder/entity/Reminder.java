package com.my.stevil_back.reminder.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.reminder.entity.enumType.MealType;
import com.my.stevil_back.reminder.entity.enumType.ReminderSource;
import com.my.stevil_back.reminder.entity.enumType.ReminderType;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;

/*
 * 개인 리마인더. scheduler 는 nextFireAt(UTC) <= now 인 행만 인덱스로 조회한다(전체 사용자 scan 금지).
 * 불변식: 비활성이거나 다음 회차가 없으면 nextFireAt == null.
 *
 *  - USER    : scheduledTime + daysOfWeek(월=bit0 ... 일=bit6) 반복.
 *  - PLANNER : 저장된 주간 계획의 날짜별 슬롯(ReminderPlannerSlot)을 따른다. sourceKey = PLANNER:{KIND}:{ordinal}.
 *              사용자는 timeOverride 로 시각만 바꿀 수 있고, 계획 동기화는 enabled/timeOverride 를 덮어쓰지 않는다.
 */
@Entity
@Table(
        name = "reminders",
        indexes = {
                @Index(name = "idx_reminders_next_fire_at", columnList = "next_fire_at"),
                @Index(name = "idx_reminders_user", columnList = "user_id")
        },
        uniqueConstraints = @UniqueConstraint(name = "uk_reminders_user_source_key", columnNames = {"user_id", "source_key"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Reminder extends BaseEntity {

    public static final int LABEL_MAX_LENGTH = 50;
    public static final String DEFAULT_TIMEZONE = "Asia/Seoul";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReminderType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "meal_type", length = 20)
    private MealType mealType;

    @Column(length = LABEL_MAX_LENGTH)
    private String label;

    @Column(nullable = false, length = 64)
    private String timezone;

    @Column(nullable = false)
    private boolean enabled;

    @Column(name = "next_fire_at")
    private Instant nextFireAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReminderSource source;

    @Column(name = "source_key", length = 40)
    private String sourceKey;

    /** USER 전용 */
    @Column(name = "scheduled_time")
    private LocalTime scheduledTime;

    /** USER 전용. 월=bit0 ... 일=bit6 */
    @Column(name = "days_of_week")
    private Short daysOfWeek;

    /** PLANNER 전용. null 이면 계획 시각을 따른다. */
    @Column(name = "time_override")
    private LocalTime timeOverride;

    public static Reminder ofUser(User user, ReminderType type, MealType mealType, LocalTime scheduledTime,
                                  int daysOfWeek, String timezone, String label, boolean enabled) {
        Reminder reminder = new Reminder();
        reminder.user = user;
        reminder.source = ReminderSource.USER;
        reminder.type = type;
        reminder.mealType = mealType;
        reminder.scheduledTime = scheduledTime;
        reminder.daysOfWeek = (short) daysOfWeek;
        reminder.timezone = timezone;
        reminder.label = label;
        reminder.enabled = enabled;
        return reminder;
    }

    /** Planner MEAL 은 mealType=null(시간대로 추정하지 않음), SNACK 은 MEAL+SNACK, EXERCISE 는 EXERCISE. */
    public static Reminder ofPlanner(User user, ReminderType type, MealType mealType, String sourceKey) {
        Reminder reminder = new Reminder();
        reminder.user = user;
        reminder.source = ReminderSource.PLANNER;
        reminder.type = type;
        reminder.mealType = mealType;
        reminder.sourceKey = sourceKey;
        reminder.timezone = DEFAULT_TIMEZONE;
        reminder.enabled = true;
        return reminder;
    }

    public void updateUserSchedule(ReminderType type, MealType mealType, LocalTime scheduledTime, int daysOfWeek) {
        this.type = type;
        this.mealType = mealType;
        this.scheduledTime = scheduledTime;
        this.daysOfWeek = (short) daysOfWeek;
    }

    public void changeTimeOverride(LocalTime timeOverride) {
        this.timeOverride = timeOverride;
    }

    public void changeLabel(String label) {
        this.label = label;
    }

    public void changeTimezone(String timezone) {
        this.timezone = timezone;
    }

    public void changeEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    /** 비활성이면 항상 null 로 둔다(불변식). */
    public void scheduleNext(Instant next) {
        this.nextFireAt = enabled ? next : null;
    }

    public boolean isPlanner() {
        return source == ReminderSource.PLANNER;
    }

    public ZoneId zone() {
        return ZoneId.of(timezone);
    }

    public int daysMask() {
        return daysOfWeek == null ? 0 : daysOfWeek;
    }
}
