package com.my.stevil_back.planner.validation;
import com.my.stevil_back.planner.dto.NutritionGoal;
import com.my.stevil_back.planner.dto.Preferences;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

/*
 * protein*4 > calories*.35 is a Stevil soft management guideline, not a hard
 * validation, since Phase 6. PlannerValidation.preferences() must no longer
 * reject on this ratio; confirmed/finite-number checks remain hard.
 */
class PlannerValidationTest {
    private Preferences prefs(NutritionGoal goal) {
        return new Preferences(LocalDate.of(2026, 9, 7), LocalTime.of(7, 0), LocalTime.of(23, 0),
                LocalTime.of(8, 0), LocalTime.of(12, 30), LocalTime.of(18, 30), LocalTime.of(19, 30), 30,
                List.of(0, 2, 4), "초보", "가볍게", "", "", "", List.of(), true, List.of(), goal);
    }

    @Test void ratioAt35PercentOrBelowPasses() {
        var goal = new NutritionGoal(70, 1, 2000, true);
        assertDoesNotThrow(() -> PlannerValidation.preferences(prefs(goal)));
    }

    @Test void ratioAbove35PercentNoLongerFails() {
        var goal = new NutritionGoal(70, 3, 1400, true);
        assertDoesNotThrow(() -> PlannerValidation.preferences(prefs(goal)));
    }

    @Test void confirmedFalseStillFails() {
        var goal = new NutritionGoal(70, 1, 2000, false);
        assertThrows(IllegalArgumentException.class, () -> PlannerValidation.preferences(prefs(goal)));
    }
}
