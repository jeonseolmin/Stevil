package com.my.stevil_back.exercise.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "user_body_metric")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserBodyMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId; // 유저 ID

    @Column(nullable = false)
    private Double weight; // 그날 측정한 몸무게 (kg)

    @Column(name = "muscle_mass")
    private Double muscleMass; // 골격근량 (인바디 연동 시 저장)

    @Column(name = "body_fat_percentage")
    private Double bodyFatPercentage; // 체지방률 (인바디 연동 시 저장)

    @Column(name = "recorded_date", nullable = false)
    private LocalDate recordedDate; // 측정한 날짜

    @Builder
    public UserBodyMetric(Long userId, Double weight, Double muscleMass,
                          Double bodyFatPercentage, LocalDate recordedDate) {
        this.userId = userId;
        this.weight = weight;
        this.muscleMass = muscleMass;
        this.bodyFatPercentage = bodyFatPercentage;
        this.recordedDate = recordedDate;
    }
}