package com.my.stevil_back.reminder.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDate;
import java.time.LocalTime;

/*
 * PLANNER 리마인더의 "계획된 날짜별 실제 시각". 요일마다 시각이 달라도(월~수 12:00, 목·금 13:00) mode 로 합치지 않고
 * 날짜마다 한 행씩 그대로 보존한다. 주 단위 계획을 저장하면 그 주(월~일)의 슬롯만 전체 교체한다.
 */
@Entity
@Table(
        name = "reminder_planner_slots",
        indexes = @Index(name = "idx_reminder_slots_plan_date", columnList = "plan_date"),
        uniqueConstraints = @UniqueConstraint(name = "uk_reminder_slots_reminder_date", columnNames = {"reminder_id", "plan_date"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReminderPlannerSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reminder_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Reminder reminder;

    @Column(name = "plan_date", nullable = false)
    private LocalDate planDate;

    @Column(name = "planned_time", nullable = false)
    private LocalTime plannedTime;

    public ReminderPlannerSlot(Reminder reminder, LocalDate planDate, LocalTime plannedTime) {
        this.reminder = reminder;
        this.planDate = planDate;
        this.plannedTime = plannedTime;
    }
}
