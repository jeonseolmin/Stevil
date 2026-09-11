package com.my.stevil_back.planner.service;

import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.planner.dto.response.PlannerProfileResponse;
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

    public PlannerProfileService(
            UserRepository users,
            UserWeightRepository weights,
            UserDietGoalRepository dietGoals
    ) {

        this.users = users;
        this.weights = weights;
        this.dietGoals = dietGoals;
    }

    // =========================================================
    // Planner Profile 조회
    // =========================================================

    @Transactional(readOnly = true)
    public PlannerProfileResponse get(
            Long userId
    ) {

        var user =
                users.findById(userId)
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED
                                        )
                        );

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
                                userId
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
                nutritionPolicyVersion
        );
    }
}