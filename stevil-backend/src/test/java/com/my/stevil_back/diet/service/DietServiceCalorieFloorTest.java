package com.my.stevil_back.diet.service;
import com.my.stevil_back.diet.entity.UserDietGoal;
import com.my.stevil_back.diet.policy.NutritionPolicy;
import com.my.stevil_back.diet.repository.DietRecordRepository;
import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.UserWeight;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/*
 * Stevil 서비스 정책: calories는 1200kcal 하한만 두고 상한은 없다(DietService.java
 * migrateNutritionPolicyIfNeeded의 legacy 보존 경로). 이 테스트는 legacy 값을
 * "재계산"하지 않고 하한 미달일 때만 1200으로 올리는 동작을 고정한다.
 */
class DietServiceCalorieFloorTest {
    private final NutritionPolicy nutritionPolicy = new NutritionPolicy();

    private UserDietGoal migrate(int legacyCalories) throws Exception {
        var weights = mock(UserWeightRepository.class);
        var dietService = new DietService(
                mock(UserDietGoalRepository.class),
                mock(DietRecordRepository.class),
                mock(UserRepository.class),
                weights,
                nutritionPolicy
        );

        var user = User.builder().id(7L).build();
        when(weights.findFirstByUserIdOrderByRecordedAtDesc(7L))
                .thenReturn(Optional.of(UserWeight.create(user, new BigDecimal("170"), null)));

        var goal = UserDietGoal.builder()
                .user(user)
                .targetWeight(165)
                .targetCalories(legacyCalories)
                .nutritionPolicyVersion(1)
                .build();

        Method migrate = DietService.class.getDeclaredMethod(
                "migrateNutritionPolicyIfNeeded", User.class, UserDietGoal.class
        );
        migrate.setAccessible(true);
        migrate.invoke(dietService, user, goal);
        return goal;
    }

    @Test void legacyZeroOrBelowStillRecalculates() throws Exception {
        var goal = migrate(0);
        assertTrue(goal.getTargetCalories() >= 1200);
        assertNotEquals(1200, goal.getTargetCalories());
    }

    @Test void legacyBelow1200IsFlooredTo1200() throws Exception {
        assertEquals(1200, migrate(1000).getTargetCalories());
        assertEquals(1200, migrate(1199).getTargetCalories());
    }

    @Test void legacyAt1200IsPreservedAsIs() throws Exception {
        assertEquals(1200, migrate(1200).getTargetCalories());
    }

    @Test void legacyAbove1200IsPreservedAsIs() throws Exception {
        assertEquals(1400, migrate(1400).getTargetCalories());
    }

    @Test void legacyAbove5000IsPreservedWithoutUpperClamp() throws Exception {
        assertEquals(5001, migrate(5001).getTargetCalories());
    }

    @Test void flooringDoesNotTouchProteinOrWeight() throws Exception {
        var floored = migrate(1000);
        var untouched = migrate(1400);
        assertEquals(untouched.getTargetProtein(), floored.getTargetProtein(), 0.001);
        assertEquals(untouched.getTargetWeight(), floored.getTargetWeight(), 0.001);
    }

    @Test void proteinCalorieConflictIsNotAutoCorrectedByTheFloor() throws Exception {
        var goal = migrate(1400);
        assertEquals(198.0, goal.getTargetProtein(), 0.001);
        assertEquals(1400, goal.getTargetCalories());
        assertFalse(nutritionPolicy.isProteinWithinCalorieLimit(
                goal.getTargetProtein(), goal.getTargetCalories()
        ));
    }
}
