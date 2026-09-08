package com.my.stevil_back.dashboard.service;

import com.my.stevil_back.dashboard.dto.DashboardResponse;
import com.my.stevil_back.dashboard.dto.RecentWeightResponse;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.UserWeight;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final BigDecimal ZERO =
            BigDecimal.ZERO.setScale(2);

    private static final BigDecimal ONE_HUNDRED =
            new BigDecimal("100.00");

    private final UserRepository userRepository;
    private final UserWeightRepository userWeightRepository;

    public DashboardResponse getDashboard(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "사용자를 찾을 수 없습니다."
                        )
                );

        UserWeight latestWeight =
                userWeightRepository
                        .findFirstByUserIdOrderByRecordedAtDesc(
                                userId
                        )
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "등록된 체중 정보가 없습니다."
                                )
                        );

        UserWeight firstWeight =
                userWeightRepository
                        .findFirstByUserIdOrderByRecordedAtAsc(
                                userId
                        )
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "등록된 체중 정보가 없습니다."
                                )
                        );

        BigDecimal startWeight =
                firstWeight.getWeight();

        BigDecimal currentWeight =
                latestWeight.getWeight();

        BigDecimal targetWeight =
                latestWeight.getTargetWeight();

        BigDecimal lostWeight =
                calculateLostWeight(
                        startWeight,
                        currentWeight
                );

        BigDecimal remainingWeight =
                calculateRemainingWeight(
                        currentWeight,
                        targetWeight
                );

        BigDecimal progressRate =
                calculateProgressRate(
                        startWeight,
                        currentWeight,
                        targetWeight
                );

        List<RecentWeightResponse> recentWeights =
                getRecentWeights(userId);

        return new DashboardResponse(
                user.getId(),
                user.getNickname(),
                user.getProfileImage(),
                startWeight,
                currentWeight,
                targetWeight,
                lostWeight,
                remainingWeight,
                progressRate,
                recentWeights
        );
    }

    private List<RecentWeightResponse> getRecentWeights(
            Long userId
    ) {
        List<UserWeight> weights =
                userWeightRepository
                        .findTop7ByUserIdOrderByRecordedAtDesc(
                                userId
                        );


        Collections.reverse(weights);

        return weights.stream()
                .map(RecentWeightResponse::from)
                .toList();
    }

    private BigDecimal calculateLostWeight(
            BigDecimal startWeight,
            BigDecimal currentWeight
    ) {
        BigDecimal lostWeight =
                startWeight.subtract(currentWeight);

        if (lostWeight.signum() < 0) {
            return ZERO;
        }

        return lostWeight.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal calculateRemainingWeight(
            BigDecimal currentWeight,
            BigDecimal targetWeight
    ) {
        if (targetWeight == null) {
            return ZERO;
        }

        BigDecimal remainingWeight =
                currentWeight.subtract(targetWeight);

        if (remainingWeight.signum() < 0) {
            return ZERO;
        }

        return remainingWeight.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }

    private BigDecimal calculateProgressRate(
            BigDecimal startWeight,
            BigDecimal currentWeight,
            BigDecimal targetWeight
    ) {
        if (targetWeight == null) {
            return ZERO;
        }

        BigDecimal totalGoal =
                startWeight.subtract(targetWeight);

        if (totalGoal.signum() <= 0) {
            return currentWeight.compareTo(targetWeight) <= 0
                    ? ONE_HUNDRED
                    : ZERO;
        }

        BigDecimal lostWeight =
                startWeight.subtract(currentWeight);

        BigDecimal rate = lostWeight
                .divide(
                        totalGoal,
                        4,
                        RoundingMode.HALF_UP
                )
                .multiply(new BigDecimal("100"));

        if (rate.signum() < 0) {
            return ZERO;
        }

        if (rate.compareTo(ONE_HUNDRED) > 0) {
            return ONE_HUNDRED;
        }

        return rate.setScale(
                2,
                RoundingMode.HALF_UP
        );
    }
}