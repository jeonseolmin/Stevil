package com.my.stevil_back.hospital.dto.request;

import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MedicalFacilityCreateRequest(

        @NotNull(message = "시설 유형은 필수입니다.")
        FacilityType facilityType,

        @NotBlank(message = "시설명은 필수입니다.")
        @Size(max = 200)
        String name,

        @NotBlank(message = "도로명 주소는 필수입니다.")
        @Size(max = 500)
        String roadAddress,

        @Size(max = 500)
        String jibunAddress,

        @Size(max = 30)
        String telephone,

        @NotNull(message = "위도는 필수입니다.")
        Double latitude,

        @NotNull(message = "경도는 필수입니다.")
        Double longitude,

        @Size(max = 30)
        String businessNumber
) {
}