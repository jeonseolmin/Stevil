package com.my.stevil_back.diet.policy;

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