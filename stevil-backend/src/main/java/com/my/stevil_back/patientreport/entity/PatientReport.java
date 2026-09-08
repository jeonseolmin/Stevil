package com.my.stevil_back.patientreport.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "patient_reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class PatientReport extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @Column(name = "ai_summary", columnDefinition = "TEXT", nullable = false)
    private String aiSummary;

    @Column(nullable = false, length = 20)
    private String status; // "UNREAD" 또는 "READ"

    public void markAsRead() {
        this.status = "READ";
    }
}