package com.my.stevil_back.diet.entity;

import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class UserDietGoal {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // 화면 우측 하단 데이터
    private double targetWeight;   // 목표 체중 (63kg)
    private int targetCalories;    // 권장 칼로리 (1800kcal)
    private double targetCarbs;    // 목표 탄수화물
    private double targetProtein;  // 목표 단백질 (90g)
    private double targetFat;      // 목표 지방
    private double targetFiber;    // 목표 식이섬유 (25g)
    private double targetCalcium;  // 목표 칼슘 (750mg)
    private double targetVitaminC; // 목표 비타민C (100mg)
    private double targetSodium;   // 목표 나트륨 제한 (1500mg)

    // 화면 좌측 중앙 데이터
    private String allergies;      // 등록된 알레르기 (예: "갑각류,견과류")
}