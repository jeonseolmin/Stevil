package com.my.stevil_back.report.entity;

import com.my.stevil_back.report.entity.enumType.ReportAction;
import com.my.stevil_back.report.entity.enumType.ReportCategory;
import com.my.stevil_back.report.entity.enumType.ReportStatus;
import com.my.stevil_back.report.entity.enumType.ReportTargetType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(
        name = "reports",
        indexes = {
                @Index(
                        name = "idx_reports_status",
                        columnList = "status"
                ),
                @Index(
                        name = "idx_reports_target",
                        columnList = "target_type,target_id"
                )
        }
)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reporter_email", nullable = false)
    private String reporterEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 30)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportCategory category;

    @Column(nullable = false, length = 500)
    private String reason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportStatus status = ReportStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "admin_action", length = 30)
    private ReportAction adminAction;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Column(name = "processed_by")
    private Long processedBy;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = ReportStatus.PENDING;
        }
    }

    public void startReview() {
        this.status = ReportStatus.IN_REVIEW;
    }

    public void resolve(
            Long adminId,
            ReportAction action,
            String adminNote
    ) {
        this.status = ReportStatus.RESOLVED;
        this.adminAction = action;
        this.adminNote = adminNote;
        this.processedBy = adminId;
        this.processedAt = LocalDateTime.now();
    }

    public void dismiss(
            Long adminId,
            String adminNote
    ) {
        this.status = ReportStatus.DISMISSED;
        this.adminAction = ReportAction.NONE;
        this.adminNote = adminNote;
        this.processedBy = adminId;
        this.processedAt = LocalDateTime.now();
    }

    public boolean isCompleted() {
        return status == ReportStatus.RESOLVED
                || status == ReportStatus.DISMISSED;
    }
}