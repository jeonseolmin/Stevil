package com.my.stevil_back.hospital.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "medical_facilities",
        indexes = {
                @Index(
                        name = "idx_medical_facilities_type",
                        columnList = "facility_type"
                ),
                @Index(
                        name = "idx_medical_facilities_status",
                        columnList = "approval_status"
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MedicalFacility extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "facility_type", nullable = false, length = 20)
    private FacilityType facilityType;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "road_address", nullable = false, length = 500)
    private String roadAddress;

    @Column(name = "jibun_address", length = 500)
    private String jibunAddress;

    @Column(length = 30)
    private String telephone;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "business_number", length = 30)
    private String businessNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private FacilityApprovalStatus approvalStatus;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "approved_by")
    private Long approvedBy;

    public MedicalFacility(
            FacilityType facilityType,
            String name,
            String roadAddress,
            String jibunAddress,
            String telephone,
            Double latitude,
            Double longitude,
            String businessNumber
    ) {
        this.facilityType = facilityType;
        this.name = name;
        this.roadAddress = roadAddress;
        this.jibunAddress = jibunAddress;
        this.telephone = telephone;
        this.latitude = latitude;
        this.longitude = longitude;
        this.businessNumber = businessNumber;
        this.approvalStatus = FacilityApprovalStatus.PENDING;
    }

    public void approve(Long adminId) {
        this.approvalStatus = FacilityApprovalStatus.APPROVED;
        this.approvedAt = LocalDateTime.now();
        this.approvedBy = adminId;
        this.rejectionReason = null;
    }

    public void reject(Long adminId, String reason) {
        this.approvalStatus = FacilityApprovalStatus.REJECTED;
        this.approvedAt = null;
        this.approvedBy = adminId;
        this.rejectionReason = reason;
    }
}