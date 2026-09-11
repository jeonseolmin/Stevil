package com.my.stevil_back.diet.entity;

import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDietGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // =========================
    // 영양 목표
    // =========================

    /**
     * 목표 체중
     */
    private double targetWeight;

    /**
     * 하루 권장 칼로리
     */
    private int targetCalories;

    /**
     * 목표 탄수화물(g)
     */
    private double targetCarbs;

    /**
     * 목표 단백질(g)
     */
    private double targetProtein;

    /**
     * 목표 지방(g)
     */
    private double targetFat;

    /**
     * 목표 식이섬유(g)
     */
    private double targetFiber;

    /**
     * 목표 칼슘(mg)
     */
    private double targetCalcium;

    /**
     * 목표 비타민C(mg)
     */
    private double targetVitaminC;

    /**
     * 목표 나트륨 최대량(mg)
     */
    private double targetSodium;

    // =========================
    // 사용자 정보
    // =========================

    /**
     * 등록된 알레르기.
     *
     * 예:
     * 갑각류,견과류
     */
    private String allergies;

    // =========================
    // 정책 버전
    // =========================

    /**
     * 영양 목표를 어떤 정책으로 계산했는지 표시한다.
     *
     * null 또는 1
     * -> 기존 탄40 / 단40 / 지20 정책
     *
     * 2
     * -> Protein First 정책
     */
    private Integer nutritionPolicyVersion;
}