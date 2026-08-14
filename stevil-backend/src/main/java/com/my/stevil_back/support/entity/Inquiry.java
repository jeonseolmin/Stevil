package com.my.stevil_back.support.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.support.entity.enumType.InquiryCategory;
import com.my.stevil_back.support.entity.enumType.InquiryStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "inquiries",
        indexes = {
                @Index(
                        name = "idx_inquiries_user_id",
                        columnList = "user_id"
                ),
                @Index(
                        name = "idx_inquiries_status",
                        columnList = "status"
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Inquiry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InquiryCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InquiryStatus status;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(name = "answered_by")
    private Long answeredBy;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    public Inquiry(
            Long userId,
            InquiryCategory category,
            String title,
            String content
    ) {
        this.userId = userId;
        this.category = category;
        this.title = title;
        this.content = content;
        this.status = InquiryStatus.PENDING;
    }

    public void startProcessing() {
        this.status = InquiryStatus.IN_PROGRESS;
    }

    public void answer(
            Long adminId,
            String answer
    ) {
        this.answer = answer;
        this.answeredBy = adminId;
        this.answeredAt = LocalDateTime.now();
        this.status = InquiryStatus.ANSWERED;
    }

    public void close() {
        this.status = InquiryStatus.CLOSED;
    }
}