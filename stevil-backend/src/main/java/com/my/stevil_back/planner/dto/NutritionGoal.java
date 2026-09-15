package com.my.stevil_back.planner.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
         *
         * Stevil 내부 서비스 정책상 하한만 둔다(의료적 안전기준 아님).
         * 상한은 두지 않는다.
         */
        @Min(1200)
        int calories,

        /**
         * 사용자가 일반 성인 식사 목표 및
         * 제한사항을 확인했다는 값.
         *
         * Python Planner에서도 true 여부를 검증한다.
         */
        boolean confirmed,

        /**
         * 사용자가 Planner에서 calories/proteinPerKg를 직접 수정해서
         * Diet(UserDietGoal)의 값과 의도적으로 달라진 상태인지 여부.
         *
         * true면 PlannerService.applyDietGoal()이 이 목표를
         * Diet 값으로 다시 덮어쓰지 않는다.
         *
         * 기존에 저장된 payload에는 이 필드가 없으므로,
         * 역직렬화 시 누락되면 false(=override 아님, 기존 동작 유지)로 처리된다.
         *
         * Boolean(boxed)인 이유: 이 프로젝트의 Jackson(tools.jackson)은
         * 누락된 필드를 생성자에 null로 전달하는데, 대상 타입이 primitive
         * boolean이면 DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES로
         * 역직렬화 자체가 실패한다(기존 저장 payload를 아예 읽지 못하게 됨).
         * Boolean으로 받아 아래 compact constructor에서 null -> false로
         * 정규화해 이 문제를 피한다.
         */
        Boolean plannerOverride
) {

    /**
     * null(필드 누락)을 false로 정규화한다.
     *
     * plannerOverride()는 이 정규화 덕분에 항상 non-null이다.
     */
    public NutritionGoal {
        plannerOverride =
                plannerOverride != null
                        && plannerOverride;
    }

    /**
     * 기존 코드/저장된 payload 호환용 생성자(plannerOverride 이전).
     *
     * plannerOverride를 명시하지 않은 기존 호출부는
     * override 아님(false)으로 취급한다.
     */
    public NutritionGoal(
            double weightKg,
            double proteinPerKg,
            int calories,
            boolean confirmed
    ) {
        this(
                weightKg,
                proteinPerKg,
                calories,
                confirmed,
                false
        );
    }
}