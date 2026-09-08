package com.my.stevil_back.partnership.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.partnership.entity.enumType.PartnershipInquiryStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "partnership_inquiries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PartnershipInquiry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FacilityType facilityType;

    @Column(nullable = false, length = 100)
    private String facilityName;

    @Column(nullable = false, length = 50)
    private String managerName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 200)
    private String address;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnershipInquiryStatus status;

    @Column(length = 500)
    private String rejectionReason;

    @Builder
    private PartnershipInquiry(
            FacilityType facilityType,
            String facilityName,
            String managerName,
            String phone,
            String email,
            String address,
            String message
    ) {
        this.facilityType = facilityType;
        this.facilityName = facilityName;
        this.managerName = managerName;
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.message = message;
        this.status = PartnershipInquiryStatus.PENDING;
    }

    public void changeStatus(
            PartnershipInquiryStatus status,
            String rejectionReason
    ) {
        this.status = status;

        this.rejectionReason =
                status == PartnershipInquiryStatus.REJECTED
                        ? rejectionReason
                        : null;
    }
}