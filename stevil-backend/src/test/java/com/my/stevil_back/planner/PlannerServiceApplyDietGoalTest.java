package com.my.stevil_back.planner;

import com.my.stevil_back.diet.entity.UserDietGoal;
import com.my.stevil_back.diet.policy.NutritionPolicy;
import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.planner.dto.NutritionGoal;
import com.my.stevil_back.planner.dto.Preferences;
import com.my.stevil_back.planner.repository.WeeklyPlanRepository;
import com.my.stevil_back.planner.service.PlannerService;
import com.my.stevil_back.user.repository.UserRepository;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Phase12: PlannerService.applyDietGoal()이 Diet의 stale한 targetProtein을
 * weightKg으로 그대로 나누지 않고, NutritionPolicy(1.2g/kg)를 현재
 * Planner weightKg 기준으로 재적용하는지 검증한다.
 */
class PlannerServiceApplyDietGoalTest {

    private final NutritionPolicy nutritionPolicy = new NutritionPolicy();

    private PlannerService service(UserDietGoalRepository dietGoals) {
        return new PlannerService(
                mock(WeeklyPlanRepository.class),
                mock(UserRepository.class),
                dietGoals,
                nutritionPolicy,
                new ObjectMapper(),
                Validation.buildDefaultValidatorFactory().getValidator(),
                "http://127.0.0.1:8091/api/plan"
        );
    }

    private Preferences preferences(double weightKg) {
        var base = new Preferences(LocalDate.of(2026, 9, 7), LocalTime.of(7, 0), LocalTime.of(23, 0),
                LocalTime.of(8, 0), LocalTime.of(12, 30), LocalTime.of(18, 30), LocalTime.of(19, 30), 30,
                List.of(0, 2, 4), "초보", "가볍게", "", "", "", List.of(), true);
        return base.withNutritionGoal(new NutritionGoal(weightKg, 1.2, 1800, false));
    }

    private NutritionGoal applyDietGoal(PlannerService service, Long userId, Preferences preferences) throws Exception {
        Method method = PlannerService.class.getDeclaredMethod("applyDietGoal", Long.class, Preferences.class);
        method.setAccessible(true);
        return ((Preferences) method.invoke(service, userId, preferences)).nutritionGoal();
    }

    @Test
    void staleTargetProteinAtDifferentWeightIsNotDividedRawIntoProteinPerKg() throws Exception {
        // Diet 목표는 80kg 당시 targetProtein=200g로 저장되어 있음(비정상적으로 높은 값).
        var dietGoal = UserDietGoal.builder()
                .targetWeight(80)
                .targetProtein(200)
                .targetCalories(1996)
                .build();
        var dietGoals = mock(UserDietGoalRepository.class);
        when(dietGoals.findByUserId(1L)).thenReturn(Optional.of(dietGoal));

        var merged = applyDietGoal(service(dietGoals), 1L, preferences(80));

        // 200 / 80 = 2.5 여서는 안 된다.
        assertNotEquals(2.5, merged.proteinPerKg(), 1e-9);
        // NutritionPolicy(80,80) = round(80*1.2) = 96 -> 96/80 = 1.2
        assertEquals(1.2, merged.proteinPerKg(), 1e-9);
    }

    @Test
    void unchangedWeightReproducesDietsOwnStoredProteinExactly() throws Exception {
        // 정상 초기 로드: Diet가 계산했던 체중(targetWeight=80)과
        // Planner weightKg(80)가 동일하면 targetProtein=96g과 일치해야 한다.
        var dietGoal = UserDietGoal.builder()
                .targetWeight(80)
                .targetProtein(nutritionPolicy.calculateProteinTarget(80, 80))
                .targetCalories(1996)
                .build();
        var dietGoals = mock(UserDietGoalRepository.class);
        when(dietGoals.findByUserId(2L)).thenReturn(Optional.of(dietGoal));

        var merged = applyDietGoal(service(dietGoals), 2L, preferences(80));

        assertEquals(dietGoal.getTargetProtein() / 80, merged.proteinPerKg(), 1e-9);
        assertEquals(1.2, merged.proteinPerKg(), 1e-9);
    }

    // =========================================================
    // plannerOverride: 사용자가 Planner에서 직접 설정한 calories/
    // proteinPerKg는 Diet 목표가 있어도 덮어쓰지 않는다.
    // =========================================================

    @Test
    void plannerOverrideTrueKeepsFrontendSuppliedCaloriesAndProteinUnchanged() throws Exception {
        // Diet 목표는 80kg 기준 96g protein / 1996kcal로 저장되어 있음.
        var dietGoal = UserDietGoal.builder()
                .targetWeight(80)
                .targetProtein(96)
                .targetCalories(1996)
                .build();
        var dietGoals = mock(UserDietGoalRepository.class);
        when(dietGoals.findByUserId(3L)).thenReturn(Optional.of(dietGoal));

        // 사용자가 Planner에서 직접 설정한 값(Diet 값과 의도적으로 다름) + override=true.
        var overriddenGoal = new NutritionGoal(80, 2.0, 2500, false, true);
        var base = new Preferences(LocalDate.of(2026, 9, 7), LocalTime.of(7, 0), LocalTime.of(23, 0),
                LocalTime.of(8, 0), LocalTime.of(12, 30), LocalTime.of(18, 30), LocalTime.of(19, 30), 30,
                List.of(0, 2, 4), "초보", "가볍게", "", "", "", List.of(), true).withNutritionGoal(overriddenGoal);

        var merged = applyDietGoal(service(dietGoals), 3L, base);

        // Diet의 96g / 1996kcal로 되돌아가지 않고, 사용자가 입력한 값 그대로 유지되어야 한다.
        assertEquals(2.0, merged.proteinPerKg(), 1e-9);
        assertEquals(2500, merged.calories());
        assertTrue(merged.plannerOverride());
    }
}
