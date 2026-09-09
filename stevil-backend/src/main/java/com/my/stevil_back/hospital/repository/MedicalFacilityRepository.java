package com.my.stevil_back.hospital.repository;

import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.hospital.entity.MedicalFacility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MedicalFacilityRepository
        extends JpaRepository<MedicalFacility, Long> {

    @Query("""
            SELECT mf 
            FROM MedicalFacility mf 
            WHERE (:facilityType IS NULL OR mf.facilityType = :facilityType) 
              AND (:approvalStatus IS NULL OR mf.approvalStatus = :approvalStatus) 
              AND (:keyword IS NULL 
                   OR LOWER(mf.name) LIKE :keyword 
                   OR LOWER(mf.roadAddress) LIKE :keyword)
            """)
    Page<MedicalFacility> searchForAdmin(
            @Param("facilityType") FacilityType facilityType,
            @Param("approvalStatus") FacilityApprovalStatus approvalStatus,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    long countByApprovalStatus(
            FacilityApprovalStatus approvalStatus
    );
}