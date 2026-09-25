package com.my.stevil_back.reminder.entity;

import com.my.stevil_back.reminder.entity.enumType.DeliveryStatus;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/*
 * 리마인더 회차 처리 기록. UNIQUE(reminder_id, scheduled_date, scheduled_time) 가 중복 발송의 최종 방어선이다.
 * scheduled_date/time 은 리마인더 timezone 기준 로컬 값. 60일 보관 후 정리한다.
 */
@Entity
@Table(
        name = "reminder_deliveries",
        indexes = @Index(name = "idx_reminder_deliveries_date", columnList = "scheduled_date"),
        uniqueConstraints = @UniqueConstraint(
                name = "uk_reminder_deliveries_occurrence",
                columnNames = {"reminder_id", "scheduled_date", "scheduled_time"}
        )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReminderDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reminder_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Reminder reminder;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "scheduled_time", nullable = false)
    private LocalTime scheduledTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeliveryStatus status;

    @Column(name = "notification_id")
    private Long notificationId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public ReminderDelivery(Reminder reminder, LocalDate scheduledDate, LocalTime scheduledTime,
                            DeliveryStatus status, Instant createdAt) {
        this.reminder = reminder;
        this.scheduledDate = scheduledDate;
        this.scheduledTime = scheduledTime;
        this.status = status;
        this.createdAt = createdAt;
    }

    public void linkNotification(Long notificationId) {
        this.notificationId = notificationId;
    }
}
