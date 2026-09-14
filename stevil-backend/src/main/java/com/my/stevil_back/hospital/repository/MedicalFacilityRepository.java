package com.my.stevil_back.hospital.repository;

import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.hospital.entity.MedicalFacility;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MedicalFacilityRepository
        extends JpaRepository<MedicalFacility, Long> {

    // 병원 지도 검색 결과에 제휴 여부를 표시하기 위해
    // 승인된 병원 시설 전체를 1회 조회(N+1 방지 목적)
    List<MedicalFacility> findByFacilityTypeAndApprovalStatus(
            FacilityType facilityType,
            FacilityApprovalStatus approvalStatus
    );

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