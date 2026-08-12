package com.my.stevil_back.user.service;

import com.my.stevil_back.user.dto.request.OnboardingRequest;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.UserWeight;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final UserRepository userRepository;
    private final UserWeightRepository userWeightRepository;

    @Transactional
    public void complete(
            Long userId,
            OnboardingRequest request
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "사용자를 찾을 수 없습니다."
                        )
                );

        validateTreatmentInformation(request);

        user.completeOnboarding(
                request.name().trim(),
                request.birthDate(),
                request.sex(),
                request.heightCm().doubleValue()
        );

        UserWeight userWeight = UserWeight.create(
                user,
                request.currentWeightKg(),
                request.targetWeightKg()
        );

        userWeightRepository.save(userWeight);
    }

    private void validateTreatmentInformation(
            OnboardingRequest request
    ) {
        if (!Boolean.TRUE.equals(request.visitedHospital())) {
            return;
        }

        if (!Boolean.TRUE.equals(request.prescribedGlp1())) {
            return;
        }

        if (request.medicationName() == null
                || request.medicationName().isBlank()) {
            throw new IllegalArgumentException(
                    "처방 약물을 입력해 주세요."
            );
        }

        if (request.firstInjectionDate() == null) {
            throw new IllegalArgumentException(
                    "최초 투여일을 입력해 주세요."
            );
        }
    }
}