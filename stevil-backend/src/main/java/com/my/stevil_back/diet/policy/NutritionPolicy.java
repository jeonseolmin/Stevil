package com.my.stevil_back.diet.policy;

import com.my.stevil_back.user.entity.enumType.ActivityLevel;
import com.my.stevil_back.user.entity.enumType.Sex;
import org.springframework.stereotype.Component;

@Component
public class NutritionPolicy {

    /**
     * 영양 목표 정책 버전.
     *
     * VERSION 1
     * - 기존 방식: 목표 칼로리 기준 탄40 / 단40 / 지20
     *
     * VERSION 2
     * - Protein First
     * - 단백질을 체중 기준으로 먼저 산정
     * - 남은 칼로리를 탄수화물 / 지방으로 배분
     */
    public static final int CURRENT_VERSION = 2;

    /**
     * Stevil의 생활관리용 기본 단백질 목표.
     *
     * 의료 처방값이 아니라 서비스 내부 기본값이며,
     * 향후 정책 변경 시 이 값만 수정할 수 있도록 분리한다.
     */
    private static final double DEFAULT_PROTEIN_PER_KG = 1.2;

    /**
     * 단백질 목표 계산.
     *
     * 감량 중인 경우 현재 체중이 아닌 목표 체중을 기준으로 사용한다.
     * 목표 체중이 현재 체중보다 크거나 유효하지 않은 경우 현재 체중 사용.
     */
    public double calculateProteinTarget(
            double currentWeight,
            double targetWeight
    ) {
        double referenceWeight = resolveReferenceWeight(
                currentWeight,
                targetWeight
        );

        double targetProtein =
                referenceWeight * DEFAULT_PROTEIN_PER_KG;

        return Math.round(targetProtein);
    }

    /**
     * 목표 단백질을 먼저 확보한 뒤,
     * 남은 칼로리의 65%를 탄수화물에 배분.
     */
    public double calculateCarbsTarget(
            int targetCalories,
            double targetProtein
    ) {
        double proteinCalories = targetProtein * 4.0;

        double remainingCalories =
                Math.max(targetCalories - proteinCalories, 0);

        double carbCalories =
                remainingCalories * 0.65;

        return Math.round(carbCalories / 4.0);
    }

    /**
     * 목표 단백질을 먼저 확보한 뒤,
     * 남은 칼로리의 35%를 지방에 배분.
     */
    public double calculateFatTarget(
            int targetCalories,
            double targetProtein
    ) {
        double proteinCalories = targetProtein * 4.0;

        double remainingCalories =
                Math.max(targetCalories - proteinCalories, 0);

        double fatCalories =
                remainingCalories * 0.35;

        return Math.round(fatCalories / 9.0);
    }

    /**
     * 단백질 목표가 Planner의 35% 규칙(PlannerValidation, validatePlan)과
     * 동일한 기준으로 열량 목표 안에 들어오는지 판정한다.
     *
     * 정합성 판정 용도이며, 이 메서드가 값을 자동으로 보정하지는 않는다.
     */
    public boolean isProteinWithinCalorieLimit(
            double targetProtein,
            double targetCalories
    ) {
        return targetProtein * 4.0 <= targetCalories * 0.35;
    }

    /**
     * 단백질 목표 달성률.
     *
     * 예)
     * 섭취 80g / 목표 100g
     * -> 80.0%
     */
    public double calculateProteinAchievementRate(
            double consumedProtein,
            double targetProtein
    ) {
        if (targetProtein <= 0) {
            return 0;
        }

        double rate =
                (consumedProtein / targetProtein) * 100.0;

        return roundOneDecimal(rate);
    }

    /**
     * 오늘 남은 단백질.
     *
     * 목표보다 많이 먹은 경우 음수가 되지 않고 0 반환.
     */
    public double calculateProteinDeficit(
            double consumedProtein,
            double targetProtein
    ) {
        double deficit =
                Math.max(targetProtein - consumedProtein, 0);

        return roundOneDecimal(deficit);
    }

    /**
     * Stevil 통합 추천 칼로리 계산(Phase15A).
     *
     * Frontend Planner의 estimateCalories()(Mifflin-St Jeor + activity
     * 배수 + 10kcal 단위 반올림)를 backend 정책으로 승격한 것이다.
     * 여기에 Backend DietService.calculateTargetCalories()가 이미 쓰던
     * 감량/증량 조정(-500 / +300)을 더한다.
     *
     * 새 수치를 만들지 않는다: activity 배수(1.4/1.6/1.8)는
     * resolveActivityFactor(), 감량/증량 조정(-500/+300)은
     * resolveCalorieGoalAdjustment()에서 각각 기존 값 그대로 재사용한다.
     *
     * 필수 입력(sex, age, heightCm, currentWeightKg, activityLevel)이
     * 유효하지 않으면 계산 자체가 불가능하므로 null을 반환한다.
     * targetWeightKg는 선택값이며, 0 이하(=알 수 없음)면 감량/증량
     * 조정 없이 유지(0) 조정만 적용한다.
     *
     * Stevil 내부 서비스 정책상 하한(1200kcal)만 두고 상한은 없다
     * (의료적 안전기준 아님, NutritionGoal.calories와 동일 정책).
     */
    public Integer calculateRecommendedCalories(
            Sex sex,
            Integer age,
            Double heightCm,
            double currentWeightKg,
            double targetWeightKg,
            ActivityLevel activityLevel
    ) {
        if (sex != Sex.MALE && sex != Sex.FEMALE) {
            return null;
        }

        if (age == null || age <= 0) {
            return null;
        }

        if (heightCm == null || heightCm <= 0) {
            return null;
        }

        if (currentWeightKg <= 0) {
            return null;
        }

        if (activityLevel == null) {
            return null;
        }

        /*
         * Mifflin-St Jeor(frontend estimateCalories()와 동일 공식).
         */
        double restingEnergy =
                10 * currentWeightKg
                        + 6.25 * heightCm
                        - 5 * age
                        + (sex == Sex.MALE ? 5 : -161);

        double totalEnergyExpenditure =
                restingEnergy
                        * resolveActivityFactor(activityLevel);

        /*
         * frontend와 동일하게 TDEE를 먼저 10kcal 단위로 반올림한 뒤
         * 감량/증량 조정을 더한다(조정값 -500/+300이 이미 10의 배수라
         * 최종 반올림을 나중에 해도 값은 수학적으로 동일하지만,
         * 이렇게 하면 조정 전 TDEE가 frontend estimateCalories()의
         * 반환값과 그대로 일치해 두 구현을 직접 비교할 수 있다).
         */
        long roundedTotalEnergyExpenditure =
                Math.round(totalEnergyExpenditure / 10.0) * 10;

        long adjustedCalories =
                roundedTotalEnergyExpenditure
                        + resolveCalorieGoalAdjustment(
                        currentWeightKg,
                        targetWeightKg
                );

        return (int) Math.max(adjustedCalories, 1200);
    }

    /**
     * Activity Level -> 배수.
     *
     * frontend Planner의 기존 activity 배수(1.4 / 1.6 / 1.8) 그대로다.
     * 새 배수를 추가하지 않는다.
     */
    private double resolveActivityFactor(
            ActivityLevel activityLevel
    ) {
        return switch (activityLevel) {
            case LOW -> 1.4;
            case MODERATE -> 1.6;
            case HIGH -> 1.8;
        };
    }

    /**
     * 감량/증량/유지 조정.
     *
     * Backend DietService.calculateTargetCalories()가 이미 쓰던 조건과
     * 값(-500 / +300)을 그대로 재사용한다.
     *
     * targetWeightKg이 0 이하(=알 수 없음)면 조정하지 않는다(0).
     */
    private int resolveCalorieGoalAdjustment(
            double currentWeightKg,
            double targetWeightKg
    ) {
        if (targetWeightKg <= 0) {
            return 0;
        }

        if (targetWeightKg < currentWeightKg) {
            return -500;
        }

        if (targetWeightKg > currentWeightKg) {
            return 300;
        }

        return 0;
    }

    /**
     * 감량 중이면 목표 체중 사용.
     *
     * 목표 체중이 없거나 증량 목표이면 현재 체중 사용.
     */
    private double resolveReferenceWeight(
            double currentWeight,
            double targetWeight
    ) {
        if (targetWeight > 0
                && targetWeight <= currentWeight) {
            return targetWeight;
        }

        return currentWeight;
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}