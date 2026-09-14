package com.my.stevil_back.planner.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record NutritionGoal(

        /**
         * Planner에서 사용하는 기준 체중.
         *
         * 기존 Python Planner는
         * weightKg * proteinPerKg
         * 방식으로 단백질 목표를 계산하므로
         * 기존 구조 호환을 위해 유지한다.
         */
        @DecimalMin("20")
        @DecimalMax("350")
        double weightKg,

        /**
         * 체중 1kg당 단백질 기준.
         *
         * 기존 Planner와 Python 코드 호환용 필드.
         *
         * 앞으로 Spring PlannerService에서
         * UserDietGoal.targetProtein을 기준으로
         * 역산해서 전달한다.
         */
        @DecimalMin("0.1")
        @DecimalMax("3")
        double proteinPerKg,

        /**
         * 하루 목표 열량.
         */
        @Min(1000)
        @Max(5000)
        int calories,

        /**
         * 사용자가 일반 성인 식사 목표 및
         * 제한사항을 확인했다는 값.
         *
         * Python Planner에서도 true 여부를 검증한다.
         */
        boolean confirmed
) {
}