package com.my.stevil_back.ad.entity;

import com.my.stevil_back.ad.enums.AdStatus;
import com.my.stevil_back.ad.enums.AdType;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ad_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 의사(병원)가 신청했는지 기존 User 테이블과 연결
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdType adType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdStatus status = AdStatus.PENDING; // 기본값은 대기중

    // 관리자가 광고를 승인할 때 세팅할 노출 기간
    private LocalDate startDate;
    private LocalDate endDate;

    // 관리자가 승인을 거절하거나 추가 피드백을 남길 때 사용하는 메모
    @Column(length = 500)
    private String adminFeedback;

    @CreationTimestamp
    private LocalDateTime requestedAt; // 신청일

    @UpdateTimestamp
    private LocalDateTime updatedAt; // 상태 변경(승인/거절) 일자

    @Builder
    public AdRequest(User doctor, AdType adType, LocalDate startDate, LocalDate endDate) {
        this.doctor = doctor;
        this.adType = adType;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    // 비즈니스 로직: 관리자 승인 메서드
    public void approveAd(LocalDate startDate, LocalDate endDate) {
        this.status = AdStatus.APPROVED;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    // 비즈니스 로직: 관리자 거절 메서드
    public void rejectAd(String adminFeedback) {
        this.status = AdStatus.REJECTED;
        this.adminFeedback = adminFeedback;
    }
}