package com.my.stevil_back.planner.dto.response;

import com.my.stevil_back.user.entity.enumType.ActivityLevel;

import java.time.LocalDateTime;

public record PlannerProfileResponse(

        /**
         * 가장 최근 체중
         */
        Double weightKg,

        /**
         * 가장 최근 체중 기록 시각
         */
        LocalDateTime weightRecordedAt,

        /**
         * 사용자 키
         */
        Double heightCm,

        /**
         * 만 나이
         */
        Integer age,

        /**
         * 성별
         */
        String sex,

        /**
         * Diet에서 사용하는 목표 체중.
         *
         * UserDietGoal이 아직 만들어지지 않은 경우 null.
         */
        Double targetWeight,

        /**
         * Diet에서 확정된 하루 목표 칼로리.
         *
         * Planner 화면에서는 이 값을 우선 사용한다.
         */
        Integer targetCalories,

        /**
         * Protein First 정책으로 계산된
         * 하루 목표 단백질(g).
         *
         * Planner에서도 이 값을 동일하게 사용한다.
         */
        Double targetProtein,

        /**
         * 현재 적용된 영양 정책 버전.
         *
         * 예:
         * 2 = Protein First
         */
        Integer nutritionPolicyVersion,

        /**
         * 개인화 calorie 계산의 activity 입력값(Phase15B).
         *
         * 아직 설정하지 않은 사용자는 null.
         */
        ActivityLevel activityLevel,

        /**
         * NutritionPolicy.calculateRecommendedCalories()로 계산한
         * runtime 추천 칼로리(Phase15C).
         *
         * targetCalories(Diet에서 확정된 목표)와는 별개이며, DB에
         * 저장하지 않는다. 필수 profile 값이 부족하면 null.
         */
        Integer recommendedCalories
) {
}