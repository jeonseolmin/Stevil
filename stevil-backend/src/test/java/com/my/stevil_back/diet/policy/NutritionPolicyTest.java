package com.my.stevil_back.diet.policy;
import com.my.stevil_back.user.entity.enumType.ActivityLevel;
import com.my.stevil_back.user.entity.enumType.Sex;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class NutritionPolicyTest {
    private final NutritionPolicy policy = new NutritionPolicy();

    @Test void legacyLowCalorieTargetViolatesThe35PercentRule() {
        assertFalse(policy.isProteinWithinCalorieLimit(198, 1400));
    }

    @Test void boundaryJustBelow35PercentFails() {
        assertFalse(policy.isProteinWithinCalorieLimit(200, 2285));
    }

    @Test void boundaryAt35PercentPasses() {
        assertTrue(policy.isProteinWithinCalorieLimit(200, 2286));
    }

    @Test void normalNewUserGoalIsWithinLimit() {
        double currentWeight = 100, targetWeight = 95;
        double protein = policy.calculateProteinTarget(currentWeight, targetWeight);
        int calories = 2620;
        assertTrue(policy.isProteinWithinCalorieLimit(protein, calories));
    }

    @Test void sameWeightAndTargetWeightUses1Point2PerKg() {
        // Phase12 test A: calculateProteinTarget(80,80) should be ~96g (80 * 1.2g/kg).
        assertEquals(96, policy.calculateProteinTarget(80, 80));
    }

    // =========================================================
    // Phase15A: calculateRecommendedCalories()
    //
    // Fixture 수치(체중/키/나이 등)는 전부 이 테스트만을 위한 입력
    // 예시일 뿐이며, 새로운 영양/activity 정책값이 아니다. 실제
    // 정책값(BMR 공식, 1.4/1.6/1.8, -500/+300, floor 1200)은 전부
    // 기존 frontend estimateCalories() / backend DietService에
    // 이미 있던 값을 그대로 재사용한다.
    //
    // 기대값은 frontend와 동일한 수식(10w+6.25h-5age+상수, TDEE를
    // 10kcal 단위로 반올림)으로 미리 계산해 하드코딩했다.
    // =========================================================

    @Test void maleMifflinStJeorMaintainWithLowActivityMatchesFrontendFormula() {
        // A, C, G: male BMR, LOW(1.4) factor, maintain(targetWeight==currentWeight -> 0 adjustment).
        // resting=1748.75, TDEE=2448.25 -> round to 2450 -> +0 -> 2450.
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.MALE, 30, 175.0, 80, 80, ActivityLevel.LOW
        );
        assertEquals(2450, recommended);
    }

    @Test void femaleMifflinStJeorMaintainWithModerateActivityMatchesFrontendFormula() {
        // B, D, G: female BMR, MODERATE(1.6) factor, maintain -> 0 adjustment.
        // resting=1289.0, TDEE=2062.4 -> round to 2060 -> +0 -> 2060.
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.FEMALE, 40, 160.0, 65, 65, ActivityLevel.MODERATE
        );
        assertEquals(2060, recommended);
    }

    @Test void highActivityWithWeightGainAppliesPlus300Adjustment() {
        // E, H: HIGH(1.8) factor, targetWeight(95) > currentWeight(90) -> +300.
        // resting=1905.0, TDEE=3429.0 -> round to 3430 -> +300 -> 3730.
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.MALE, 25, 180.0, 90, 95, ActivityLevel.HIGH
        );
        assertEquals(3730, recommended);
    }

    @Test void weightLossAdjustmentSubtracts500FromRoundedTdee() {
        // F: same inputs as the male/LOW fixture above, but targetWeight(70) < currentWeight(80) -> -500.
        // Rounded TDEE 2450 - 500 = 1950.
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.MALE, 30, 175.0, 80, 70, ActivityLevel.LOW
        );
        assertEquals(1950, recommended);
    }

    @Test void lowTdeeWithLossAdjustmentIsClampedToThe1200Floor() {
        // I: resting=694.0, TDEE=971.6 -> round to 970 -> -500 -> 470, clamped to Stevil's 1200 floor
        // (internal service policy, not a medical safety threshold -- same as NutritionGoal.calories).
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.FEMALE, 19, 120.0, 20, 15, ActivityLevel.LOW
        );
        assertEquals(1200, recommended);
    }

    @Test void veryHighInputHasNoUpperMaximum() {
        // J: resting=3155.0, TDEE=5679.0 -> round to 5680 -> +300 gain -> 5980, returned unclamped.
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.MALE, 20, 200.0, 200, 210, ActivityLevel.HIGH
        );
        assertEquals(5980, recommended);
        assertTrue(recommended > 5000);
    }

    @Test void invalidOrMissingSexReturnsNull() {
        // K
        assertNull(policy.calculateRecommendedCalories(null, 30, 175.0, 80, 80, ActivityLevel.LOW));
        assertNull(policy.calculateRecommendedCalories(Sex.OTHER, 30, 175.0, 80, 80, ActivityLevel.LOW));
        assertNull(policy.calculateRecommendedCalories(Sex.UNDISCLOSED, 30, 175.0, 80, 80, ActivityLevel.LOW));
    }

    @Test void invalidOrMissingAgeReturnsNull() {
        // L
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, null, 175.0, 80, 80, ActivityLevel.LOW));
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, 0, 175.0, 80, 80, ActivityLevel.LOW));
    }

    @Test void invalidOrMissingHeightReturnsNull() {
        // M
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, 30, null, 80, 80, ActivityLevel.LOW));
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, 30, 0.0, 80, 80, ActivityLevel.LOW));
    }

    @Test void invalidOrMissingWeightReturnsNull() {
        // N: currentWeightKg is a primitive double, so "missing" follows the codebase's existing
        // <=0-means-absent convention (see NutritionPolicy.resolveReferenceWeight(), PlannerService.applyDietGoal()).
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, 30, 175.0, 0, 80, ActivityLevel.LOW));
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, 30, 175.0, -1, 80, ActivityLevel.LOW));
    }

    @Test void missingActivityLevelReturnsNull() {
        // O
        assertNull(policy.calculateRecommendedCalories(Sex.MALE, 30, 175.0, 80, 80, null));
    }

    @Test void unavailableTargetWeightAppliesNoGoalAdjustment() {
        // targetWeightKg<=0 ("unavailable") behaves like maintain: 0 adjustment, same as the
        // male/LOW maintain fixture above.
        Integer recommended = policy.calculateRecommendedCalories(
                Sex.MALE, 30, 175.0, 80, 0, ActivityLevel.LOW
        );
        assertEquals(2450, recommended);
    }
}
