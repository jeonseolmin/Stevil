package com.my.stevil_back.hospital.dto.response;

import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.hospital.entity.MedicalFacility;

import java.time.LocalDateTime;

public record AdminFacilityResponse(
        Long id,
        FacilityType facilityType,
        String name,
        String roadAddress,
        String jibunAddress,
        String telephone,
        Double latitude,
        Double longitude,
        String businessNumber,
        FacilityApprovalStatus approvalStatus,
        String rejectionReason,
        LocalDateTime approvedAt,
        Long approvedBy,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static AdminFacilityResponse from(
            MedicalFacility facility
    ) {
        return new AdminFacilityResponse(
                facility.getId(),
                facility.getFacilityType(),
                facility.getName(),
                facility.getRoadAddress(),
                facility.getJibunAddress(),
                facility.getTelephone(),
                facility.getLatitude(),
                facility.getLongitude(),
                facility.getBusinessNumber(),
                facility.getApprovalStatus(),
                facility.getRejectionReason(),
                facility.getApprovedAt(),
                facility.getApprovedBy(),
                facility.getCreatedAt(),
                facility.getUpdatedAt()
        );
    }
}