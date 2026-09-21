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
 * V1->V2 마이그레이션은 기존 targetCalories를 보존하고 targetProtein만
 * 새 정책으로 재계산한다(DietService.migrateNutritionPolicyIfNeeded).
 *
 * 이 테스트는 그 결과가 Planner의 35% 규칙을 위반할 수 있음을 고정한다.
 * 제품 정책이 확정되기 전까지 자동 보정은 적용하지 않으므로, 이 위반이
 * "고쳐지지 않은 채로 재현되는 것"이 현재 기대값이다.
 */
class DietServiceMigrationConflictTest {
    private final NutritionPolicy nutritionPolicy = new NutritionPolicy();

    @Test void v1ToV2MigrationCanProduceAProteinCalorieConflict() throws Exception {
        var weights = mock(UserWeightRepository.class);
        var dietService = new DietService(
                mock(UserDietGoalRepository.class),
                mock(DietRecordRepository.class),
                mock(UserRepository.class),
                weights,
                nutritionPolicy
        );

        var user = User.builder().id(42L).build();
        when(weights.findFirstByUserIdOrderByRecordedAtDesc(42L))
                .thenReturn(Optional.of(UserWeight.create(user, new BigDecimal("170"), null)));

        var existingGoal = UserDietGoal.builder()
                .user(user)
                .targetWeight(165)
                .targetCalories(1400)
                .nutritionPolicyVersion(1)
                .build();

        Method migrate = DietService.class.getDeclaredMethod(
                "migrateNutritionPolicyIfNeeded", User.class, UserDietGoal.class
        );
        migrate.setAccessible(true);
        migrate.invoke(dietService, user, existingGoal);

        assertEquals(198.0, existingGoal.getTargetProtein(), 0.001);
        assertEquals(1400, existingGoal.getTargetCalories());
        assertFalse(nutritionPolicy.isProteinWithinCalorieLimit(
                existingGoal.getTargetProtein(), existingGoal.getTargetCalories()
        ));
    }
}
