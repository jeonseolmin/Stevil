package com.my.stevil_back.user.dto.request;

import com.my.stevil_back.user.entity.enumType.Sex;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record OnboardingRequest(

        @NotBlank(message = "이름은 필수입니다.")
        @Size(max = 50)
        String name,

        @NotNull(message = "생년월일은 필수입니다.")
        @Past(message = "생년월일은 과거 날짜여야 합니다.")
        LocalDate birthDate,

        @NotNull(message = "성별은 필수입니다.")
        Sex sex,

        @NotNull(message = "키는 필수입니다.")
        @DecimalMin(value = "100.0", message = "키는 100cm 이상이어야 합니다.")
        @DecimalMax(value = "250.0", message = "키는 250cm 이하여야 합니다.")
        BigDecimal heightCm,

        @NotNull(message = "현재 체중은 필수입니다.")
        @DecimalMin(value = "30.0")
        @DecimalMax(value = "350.0")
        BigDecimal currentWeightKg,

        @NotNull(message = "목표 체중은 필수입니다.")
        @DecimalMin(value = "30.0")
        @DecimalMax(value = "350.0")
        BigDecimal targetWeightKg,

        @NotNull(message = "병원 방문 여부는 필수입니다.")
        Boolean visitedHospital,

        Boolean prescribedGlp1,

        String medicationName,

        String dose,

        LocalDate firstInjectionDate

) {
}