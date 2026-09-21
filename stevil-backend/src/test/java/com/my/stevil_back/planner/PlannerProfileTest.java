package com.my.stevil_back.planner;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.diet.entity.UserDietGoal;
import com.my.stevil_back.diet.policy.NutritionPolicy;
import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.planner.controller.PlannerProfileController;
import com.my.stevil_back.planner.service.PlannerProfileService;
import com.my.stevil_back.user.entity.*;
import com.my.stevil_back.user.entity.enumType.ActivityLevel;
import com.my.stevil_back.user.entity.enumType.Sex;
import com.my.stevil_back.user.repository.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.*;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/*
 * Phase15C: PlannerProfileResponse의 additive field(activityLevel,
 * recommendedCalories)와 activityLevel mutation을 검증한다.
 *
 * UserTest와 같은 이유로(이 프로젝트에는 @DataJpaTest/MockMvc 같은
 * repository/HTTP 통합 테스트 인프라가 없다) 여기서도 순수 Mockito
 * 단위 테스트로만 검증한다. invalid enum -> 400, 미인증 -> 401/403은
 * Jackson 역직렬화/Spring Security가 이미 보장하는 프레임워크 동작이라
 * (기존 AdminUserController의 동일한 @NotNull enum 필드 PATCH도 이
 * 계층을 별도로 테스트하지 않음) 이 phase에서 새 HTTP 계층 테스트
 * 인프라를 추가하지 않는다.
 */
class PlannerProfileTest {
    @Test void readsOnlyAuthenticatedUsersLatestMeasurementWithoutWriting() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(17L);
        var user=User.builder().id(17L).heightCm(175.0).sex(Sex.MALE).birthDate(LocalDate.of(1995,1,1)).build();
        when(users.findById(17L)).thenReturn(Optional.of(user));
        var measured=LocalDateTime.of(2026,9,1,8,0);
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(17L),any()))
                .thenReturn(Optional.of(UserWeight.create(user,new BigDecimal("72.30"),null,measured)));
        var result=new PlannerProfileController(new PlannerProfileService(users,weights,mock(UserDietGoalRepository.class),new NutritionPolicy())).get(principal);
        assertEquals(72.3,result.weightKg());assertEquals(measured,result.weightRecordedAt());assertEquals(175.0,result.heightCm());
        verify(weights).findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(17L),any());
        verifyNoMoreInteractions(weights);
    }
    @Test void missingMeasurementAndDemographicsRemainNull() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(8L);
        when(users.findById(8L)).thenReturn(Optional.of(User.builder().id(8L).build()));
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(8L),any())).thenReturn(Optional.empty());
        var result=new PlannerProfileController(new PlannerProfileService(users,weights,mock(UserDietGoalRepository.class),new NutritionPolicy())).get(principal);
        assertNull(result.weightKg());assertNull(result.age());assertNull(result.sex());
        assertNull(result.activityLevel());assertNull(result.recommendedCalories());
    }

    // =========================================================
    // Phase15C - A: activityLevel + profile 값 정상 -> recommendedCalories 정상 반환
    // =========================================================
    @Test void recommendedCaloriesIsComputedFromCurrentProfileWhenActivityLevelIsSet() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);var dietGoals=mock(UserDietGoalRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(30L);

        LocalDate birthDate=LocalDate.now(ZoneId.of("Asia/Seoul")).minusYears(30);
        var user=User.builder().id(30L).heightCm(175.0).sex(Sex.MALE).birthDate(birthDate).build();
        user.updateActivityLevel(ActivityLevel.LOW);
        when(users.findById(30L)).thenReturn(Optional.of(user));

        var measured=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(30L),any()))
                .thenReturn(Optional.of(UserWeight.create(user,new BigDecimal("80.00"),null,measured)));
        when(dietGoals.findByUserId(30L)).thenReturn(Optional.empty());

        var result=new PlannerProfileController(new PlannerProfileService(users,weights,dietGoals,new NutritionPolicy())).get(principal);

        Integer expected=new NutritionPolicy().calculateRecommendedCalories(Sex.MALE,30,175.0,80.0,0.0,ActivityLevel.LOW);
        assertEquals(expected,result.recommendedCalories());
        assertEquals(ActivityLevel.LOW,result.activityLevel());
    }

    // =========================================================
    // Phase15C - B: activityLevel == null -> recommendedCalories == null
    // (다른 profile 값은 전부 정상이어도 activityLevel만 없으면 null)
    // =========================================================
    @Test void recommendedCaloriesIsNullWhenActivityLevelIsNullEvenWithFullProfile() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);var dietGoals=mock(UserDietGoalRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(31L);

        var user=User.builder().id(31L).heightCm(175.0).sex(Sex.MALE).birthDate(LocalDate.of(1995,1,1)).build();
        // activityLevel 미설정 상태 그대로 둔다.
        when(users.findById(31L)).thenReturn(Optional.of(user));

        var measured=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(31L),any()))
                .thenReturn(Optional.of(UserWeight.create(user,new BigDecimal("80.00"),null,measured)));
        when(dietGoals.findByUserId(31L)).thenReturn(Optional.empty());

        var result=new PlannerProfileController(new PlannerProfileService(users,weights,dietGoals,new NutritionPolicy())).get(principal);

        assertNull(result.activityLevel());
        assertNull(result.recommendedCalories());
        // 나머지 profile 값은 정상 반환돼야 한다(activityLevel 하나 때문에 전체 실패 금지).
        assertEquals(80.0,result.weightKg());
        assertEquals(175.0,result.heightCm());
    }

    // =========================================================
    // Phase15C - C: targetCalories와 recommendedCalories가 달라도
    // 서로 동기화하거나 덮어쓰지 않고 둘 다 그대로 응답한다.
    // =========================================================
    @Test void targetCaloriesAndRecommendedCaloriesAreBothReturnedIndependently() {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);var dietGoals=mock(UserDietGoalRepository.class);
        var principal=mock(CustomUserDetails.class);when(principal.getUserId()).thenReturn(32L);

        LocalDate birthDate=LocalDate.now(ZoneId.of("Asia/Seoul")).minusYears(30);
        var user=User.builder().id(32L).heightCm(175.0).sex(Sex.MALE).birthDate(birthDate).build();
        user.updateActivityLevel(ActivityLevel.LOW);
        when(users.findById(32L)).thenReturn(Optional.of(user));

        var measured=LocalDateTime.now(ZoneId.of("Asia/Seoul"));
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(32L),any()))
                .thenReturn(Optional.of(UserWeight.create(user,new BigDecimal("80.00"),null,measured)));

        // 기존 Diet 목표(targetCalories)는 recommendedCalories와 일부러 다른 값으로 둔다.
        var dietGoal=UserDietGoal.builder().targetWeight(75).targetCalories(1996).targetProtein(120).nutritionPolicyVersion(2).build();
        when(dietGoals.findByUserId(32L)).thenReturn(Optional.of(dietGoal));

        var result=new PlannerProfileController(new PlannerProfileService(users,weights,dietGoals,new NutritionPolicy())).get(principal);

        Integer expectedRecommended=new NutritionPolicy().calculateRecommendedCalories(Sex.MALE,30,175.0,80.0,75.0,ActivityLevel.LOW);
        assertEquals(1996,result.targetCalories());
        assertEquals(expectedRecommended,result.recommendedCalories());
        assertNotEquals(result.targetCalories(),result.recommendedCalories());
    }

    // =========================================================
    // Phase15C - E/F/G: activityLevel mutation (LOW/MODERATE/HIGH)
    // =========================================================
    @Test void updatingActivityLevelToLowPersistsThroughDomainMethodOnly() {
        assertUpdateActivityLevelPersists(40L, ActivityLevel.LOW);
    }

    @Test void updatingActivityLevelToModeratePersistsThroughDomainMethodOnly() {
        assertUpdateActivityLevelPersists(41L, ActivityLevel.MODERATE);
    }

    @Test void updatingActivityLevelToHighPersistsThroughDomainMethodOnly() {
        assertUpdateActivityLevelPersists(42L, ActivityLevel.HIGH);
    }

    private void assertUpdateActivityLevelPersists(Long userId, ActivityLevel activityLevel) {
        var users=mock(UserRepository.class);var weights=mock(UserWeightRepository.class);var dietGoals=mock(UserDietGoalRepository.class);
        var user=User.builder().id(userId).build();
        when(users.findById(userId)).thenReturn(Optional.of(user));
        when(weights.findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(eq(userId),any())).thenReturn(Optional.empty());
        when(dietGoals.findByUserId(userId)).thenReturn(Optional.empty());

        var service=new PlannerProfileService(users,weights,dietGoals,new NutritionPolicy());
        var result=service.updateActivityLevel(userId, activityLevel);

        // User.updateActivityLevel() 도메인 메서드를 통해서만 반영됐는지 확인.
        assertEquals(activityLevel,user.getActivityLevel());
        // mutation 직후 재계산된 profile을 그대로 돌려준다.
        assertEquals(activityLevel,result.activityLevel());
        // targetCalories 등 UserDietGoal은 이 mutation으로 절대 저장/수정되지 않는다.
        verify(dietGoals,never()).save(any());
        verify(users,never()).save(any());
    }
}
