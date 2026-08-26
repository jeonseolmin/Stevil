package com.my.stevil_back.partnership.dto.response;

import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.partnership.entity.PartnershipInquiry;
import com.my.stevil_back.partnership.entity.enumType.PartnershipInquiryStatus;

import java.time.LocalDateTime;

public record PartnershipInquiryResponse(

        Long id,
        FacilityType facilityType,
        String facilityName,
        String managerName,
        String phone,
        String email,
        String address,
        String message,
        PartnershipInquiryStatus status,
        String rejectionReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt

) {

    public static PartnershipInquiryResponse from(
            PartnershipInquiry inquiry
    ) {
        return new PartnershipInquiryResponse(
                inquiry.getId(),
                inquiry.getFacilityType(),
                inquiry.getFacilityName(),
                inquiry.getManagerName(),
                inquiry.getPhone(),
                inquiry.getEmail(),
                inquiry.getAddress(),
                inquiry.getMessage(),
                inquiry.getStatus(),
                inquiry.getRejectionReason(),
                inquiry.getCreatedAt(),
                inquiry.getUpdatedAt()
        );
    }
}