package com.my.stevil_back.partnership.dto.request;

import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PartnershipInquiryCreateRequest(

        @NotNull
        FacilityType facilityType,

        @NotBlank
        @Size(max = 100)
        String facilityName,

        @NotBlank
        @Size(max = 50)
        String managerName,

        @NotBlank
        @Size(max = 20)
        String phone,

        @NotBlank
        @Email
        @Size(max = 100)
        String email,

        @NotBlank
        @Size(max = 200)
        String address,

        @Size(max = 1000)
        String message
) {
}