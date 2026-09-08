package com.my.stevil_back.weight.service;

import com.my.stevil_back.weight.dto.WeightRequest;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.UserWeight;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional
public class WeightService {

    private final UserWeightRepository userWeightRepository;
    private final UserRepository userRepository;

    public void recordWeight(Long userId, WeightRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

        BigDecimal targetToSave = request.getTargetWeight() != null
                ? BigDecimal.valueOf(request.getTargetWeight())
                : null;

        // 프론트에서 목표 체중을 입력하지 않았다면(null), 기존 목표 체중 유지
        if (targetToSave == null) {
            targetToSave = userWeightRepository.findFirstByUserIdOrderByRecordedAtDesc(userId)
                    .map(UserWeight::getTargetWeight)
                    .orElse(null);
        }

        UserWeight userWeight = UserWeight.create(
                user,
                BigDecimal.valueOf(request.getWeight()),
                targetToSave,
                request.getRecordedAt()
        );

        userWeightRepository.save(userWeight);
    }
}