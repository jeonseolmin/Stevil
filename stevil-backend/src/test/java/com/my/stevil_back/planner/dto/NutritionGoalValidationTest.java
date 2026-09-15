package com.my.stevil_back.planner.dto;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
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

    // =========================================================
    // plannerOverride: 저장/재로드(JSON) 시에도 값이 유지되어야 하고,
    // override 필드가 없던 기존 저장 payload는 false로 취급되어야 한다.
    // =========================================================

    @Test void plannerOverrideRoundTripsThroughJson() {
        var mapper = new ObjectMapper();
        var goal = new NutritionGoal(70, 1.5, 2200, true, true);

        var json = mapper.writeValueAsString(goal);
        var restored = mapper.readValue(json, NutritionGoal.class);

        assertTrue(restored.plannerOverride());
        assertEquals(1.5, restored.proteinPerKg(), 1e-9);
        assertEquals(2200, restored.calories());
    }

    @Test void legacyPayloadWithoutPlannerOverrideFieldDefaultsToFalse() {
        var mapper = new ObjectMapper();
        // plannerOverride 필드가 아예 없는 기존(이번 변경 이전) 저장 payload.
        var legacyJson = "{\"weightKg\":70.0,\"proteinPerKg\":1.2,\"calories\":1996,\"confirmed\":true}";

        var restored = mapper.readValue(legacyJson, NutritionGoal.class);

        assertFalse(restored.plannerOverride());
        assertEquals(1996, restored.calories());
    }
}
