package com.my.stevil_back.diet.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class DietDashboardResponse {

    // 1. 오늘 섭취 칼로리 & 탄단지 메인 요약 (좌측 상단)
    private int todayTotalCalories;
    private int targetCalories;
    private double todayCarbs;
    private double todayProtein;
    private double todayFat;

    // 2. 알레르기 주의 정보 (좌측 중앙)
    private List<String> registeredAllergies; // ["갑각류", "견과류"]
    private boolean hasAllergyWarning;        // true면 빨간색 경고창 표시
    private String warningFoodName;           // "견과류 샐러드"
    private List<String> detectedAllergens;   // ["견과류"]

    // 3. 영양 섭취 요약 (우측 상단 - 적정/부족/과다 판별 포함)
    private NutritionDetail carbsDetail;
    private NutritionDetail proteinDetail;
    private NutritionDetail fatDetail;
    private NutritionDetail fiberDetail;
    private NutritionDetail calciumDetail;
    private NutritionDetail vitaminCDetail;
    private NutritionDetail sodiumDetail;

    // 4. 추천 영양 목표 (우측 하단)
    private double targetWeight;

    // 5. 오늘의 식단 기록 리스트 (좌측 하단)
    private List<DietRecordDto> todayRecords;

    // --- 내부 DTO 클래스들 ---
    @Getter @Builder
    public static class NutritionDetail {
        private double currentAmount;
        private double targetAmount;
        private String status; // "적정", "부족", "과다" -> 백엔드에서 미리 계산해서 내려줌
    }

    @Getter @Builder
    public static class DietRecordDto {
        private Long recordId;
        private String mealType; // "아침", "점심"
        private String time;     // "08:00"
        private String foodName;
        private int calories;
    }
}