package com.my.stevil_back.planner.service;

import com.my.stevil_back.diet.policy.NutritionPolicy;
import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.planner.dto.response.PlannerProfileResponse;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.ActivityLevel;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.Period;
import java.time.ZoneId;

@Service
public class PlannerProfileService {

    private final UserRepository users;
    private final UserWeightRepository weights;

    /**
     * Diet에서 확정한 목표 체중 / 칼로리 / 단백질을
     * Planner 화면에도 동일하게 전달하기 위해 사용한다.
     */
    private final UserDietGoalRepository dietGoals;

    /**
     * recommendedCalories(Phase15C) runtime 계산에 사용한다.
     */
    private final NutritionPolicy nutritionPolicy;

    public PlannerProfileService(
            UserRepository users,
            UserWeightRepository weights,
            UserDietGoalRepository dietGoals,
            NutritionPolicy nutritionPolicy
    ) {

        this.users = users;
        this.weights = weights;
        this.dietGoals = dietGoals;
        this.nutritionPolicy = nutritionPolicy;
    }

    // =========================================================
    // Planner Profile 조회
    // =========================================================

    @Transactional(readOnly = true)
    public PlannerProfileResponse get(
            Long userId
    ) {

        var user = findUser(userId);

        return buildResponse(user);
    }

    // =========================================================
    // Activity Level 변경(Phase15C)
    // =========================================================

    /**
     * 현재 로그인 사용자의 activityLevel을 갱신한다.
     *
     * User.updateActivityLevel() 외의 다른 필드는 건드리지 않으며,
     * targetCalories 등 UserDietGoal은 이 메서드에서 전혀 수정하지
     * 않는다. 갱신 직후 값을 반영한 PlannerProfileResponse를
     * 재계산해서 돌려준다(추가 조회 없이 이미 로드된 user 재사용).
     */
    @Transactional
    public PlannerProfileResponse updateActivityLevel(
            Long userId,
            ActivityLevel activityLevel
    ) {

        var user = findUser(userId);

        user.updateActivityLevel(activityLevel);

        return buildResponse(user);
    }

    private User findUser(Long userId) {
        return users.findById(userId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.UNAUTHORIZED
                                )
                );
    }

    private PlannerProfileResponse buildResponse(
            User user
    ) {

        LocalDateTime now =
                LocalDateTime.now(
                        ZoneId.of("Asia/Seoul")
                );

        // =====================================================
        // 최신 체중 기록
        // =====================================================

        var latestWeight =
                weights
                        .findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(
                                user.getId(),
                                now
                        )
                        .orElse(null);

        Double weightKg =
                latestWeight == null
                        || latestWeight.getWeight() == null
                        ? null
                        : latestWeight
                          .getWeight()
                          .doubleValue();

        LocalDateTime weightRecordedAt =
                latestWeight == null
                        ? null
                        : latestWeight.getRecordedAt();

        // =====================================================
        // 사용자 기본 정보
        // =====================================================

        Integer age =
                user.getBirthDate() == null
                        ? null
                        : Period
                          .between(
                                  user.getBirthDate(),
                                  now.toLocalDate()
                          )
                          .getYears();

        Double heightCm =
                user.getHeightCm();

        String sex =
                user.getSex() == null
                        ? null
                        : user
                          .getSex()
                          .name();

        // =====================================================
        // Diet 목표
        // =====================================================

        var dietGoal =
                dietGoals
                        .findByUserId(
                                user.getId()
                        )
                        .orElse(null);

        Double targetWeight =
                dietGoal == null
                        || dietGoal.getTargetWeight() <= 0
                        ? null
                        : dietGoal.getTargetWeight();

        Integer targetCalories =
                dietGoal == null
                        || dietGoal.getTargetCalories() <= 0
                        ? null
                        : dietGoal.getTargetCalories();

        Double targetProtein =
                dietGoal == null
                        || dietGoal.getTargetProtein() <= 0
                        ? null
                        : dietGoal.getTargetProtein();

        Integer nutritionPolicyVersion =
                dietGoal == null
                        ? null
                        : dietGoal
                          .getNutritionPolicyVersion();

        // =====================================================
        // 추천 칼로리(Phase15C)
        //
        // 필수 profile 값(성별/나이/키/현재 체중/activityLevel)이
        // 부족하면 NutritionPolicy.calculateRecommendedCalories()가
        // 자체적으로 null을 반환한다. 여기서는 fallback 값을 넣지
        // 않고 그 결과를 그대로 사용한다. currentWeightKg는 primitive
        // double 파라미터라 weightKg가 null이면 호출 자체를 생략한다.
        // =====================================================

        Integer recommendedCalories =
                weightKg == null
                        ? null
                        : nutritionPolicy.calculateRecommendedCalories(
                                user.getSex(),
                                age,
                                heightCm,
                                weightKg,
                                targetWeight == null ? 0.0 : targetWeight,
                                user.getActivityLevel()
                        );

        // =====================================================
        // 응답
        // =====================================================

        return new PlannerProfileResponse(
                weightKg,
                weightRecordedAt,
                heightCm,
                age,
                sex,
                targetWeight,
                targetCalories,
                targetProtein,
                nutritionPolicyVersion,
                user.getActivityLevel(),
                recommendedCalories
        );
    }
}