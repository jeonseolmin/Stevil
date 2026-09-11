package com.my.stevil_back.diet.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class DietDashboardResponse {

    // =========================
    // 1. 오늘 섭취량
    // =========================

    private int todayTotalCalories;

    private int targetCalories;

    private double todayCarbs;

    private double todayProtein;

    private double todayFat;

    // =========================
    // 2. Protein First
    // =========================

    /**
     * 하루 목표 단백질(g)
     */
    private double targetProtein;

    /**
     * 오늘 단백질 목표 달성률(%)
     *
     * 예:
     * 82g / 100g
     * -> 82.0
     */
    private double proteinAchievementRate;

    /**
     * 오늘 목표까지 남은 단백질(g)
     *
     * 목표를 넘은 경우 0
     */
    private double proteinDeficit;

    // =========================
    // 3. 알레르기 정보
    // =========================

    private List<String> registeredAllergies;

    private boolean hasAllergyWarning;

    private String warningFoodName;

    private List<String> detectedAllergens;

    // =========================
    // 4. 영양 섭취 상세
    // =========================

    private NutritionDetail carbsDetail;

    private NutritionDetail proteinDetail;

    private NutritionDetail fatDetail;

    private NutritionDetail fiberDetail;

    private NutritionDetail calciumDetail;

    private NutritionDetail vitaminCDetail;

    private NutritionDetail sodiumDetail;

    // =========================
    // 5. 사용자 목표
    // =========================

    private double targetWeight;

    // =========================
    // 6. 오늘 식단 기록
    // =========================

    private List<DietRecordDto> todayRecords;

    // =========================
    // 내부 DTO
    // =========================

    @Getter
    @Builder
    public static class NutritionDetail {

        /**
         * 현재 섭취량
         */
        private double currentAmount;

        /**
         * 목표 섭취량
         */
        private double targetAmount;

        /**
         * 적정 / 부족 / 과다
         */
        private String status;
    }

    @Getter
    @Builder
    public static class DietRecordDto {

        private Long recordId;

        private String mealType;

        private String time;

        private String foodName;

        private int calories;

        /**
         * 해당 음식/식사의 단백질량
         */
        private double protein;
    }
}