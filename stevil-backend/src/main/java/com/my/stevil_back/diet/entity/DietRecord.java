package com.my.stevil_back.diet.entity;

import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class DietRecord {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private LocalDate recordDate; // 기록 날짜 (예: 오늘)
    private LocalTime recordTime; // 섭취 시간 (예: 08:00, 12:30)
    private String mealType;      // 식사 타입 (BREAKFAST, LUNCH, DINNER, SNACK)

    private String foodName;      // 음식명 (예: 견과류 샐러드)
    private String imageUrl;      // 사진 등록 시 이미지 URL

    // 해당 음식의 영양소
    private int calories;
    private double carbs;
    private double protein;
    private double fat;
    private double fiber;
    private double calcium;
    private double vitaminC;
    private double sodium;
}