package com.my.stevil_back.diet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DietRecordRequest {

    private LocalDate recordDate; // 기록 날짜 (예: 2026-08-18)
    private LocalTime recordTime; // 먹은 시간 (예: 08:30)
    private String mealType;      // 식사 타입 (아침, 점심, 저녁, 간식)

    private String foodName;      // 음식명 (예: 닭가슴살 샐러드)

    // 직접 입력 시 받을 영양소 정보들
    private int calories;
    private double carbs;
    private double protein;
    private double fat;
    private double fiber;
    private double calcium;
    private double vitaminC;
    private double sodium;
}