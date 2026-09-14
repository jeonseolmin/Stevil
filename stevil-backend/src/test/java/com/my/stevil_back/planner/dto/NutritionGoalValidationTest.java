package com.my.stevil_back.planner.dto;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/*
 * Stevil 서비스 정책: calories는 1200kcal 하한만 두고 상한은 없다.
 */
class NutritionGoalValidationTest {
    private boolean valid(int calories) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var goal = new NutritionGoal(70, 1.0, calories, true);
            return factory.getValidator().validate(goal).isEmpty();
        }
    }

    @Test void below1200Fails() {
        assertFalse(valid(1199));
    }

    @Test void at1200Passes() {
        assertTrue(valid(1200));
    }

    @Test void at5000StillPasses() {
        assertTrue(valid(5000));
    }

    @Test void above5000IsNotRejectedByAnUpperBound() {
        assertTrue(valid(5001));
    }

    @Test void aVeryLargeValueIsNotRejectedByAnUpperBound() {
        assertTrue(valid(1_000_000));
    }
}
