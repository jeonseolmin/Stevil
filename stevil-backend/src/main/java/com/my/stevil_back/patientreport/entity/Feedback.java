package com.my.stevil_back.patientreport.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "patient_feedbacks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Feedback extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 리포트에 대한 피드백인지 연결
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private PatientReport report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id", nullable = false)
    private User doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content; // 피드백 내용
}