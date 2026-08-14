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
            SELECT f
            FROM MedicalFacility f
            WHERE (:type IS NULL OR f.facilityType = :type)
              AND (:status IS NULL OR f.approvalStatus = :status)
              AND (
                    :keyword IS NULL
                    OR LOWER(f.name)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(f.roadAddress)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<MedicalFacility> searchForAdmin(
            @Param("type") FacilityType type,
            @Param("status") FacilityApprovalStatus status,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    long countByApprovalStatus(
            FacilityApprovalStatus approvalStatus
    );
}