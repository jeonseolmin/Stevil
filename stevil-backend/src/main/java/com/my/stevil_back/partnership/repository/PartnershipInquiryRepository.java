package com.my.stevil_back.partnership.repository;

import com.my.stevil_back.partnership.entity.PartnershipInquiry;
import com.my.stevil_back.partnership.entity.enumType.PartnershipInquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnershipInquiryRepository
        extends JpaRepository<PartnershipInquiry, Long> {

    Page<PartnershipInquiry> findByStatus(
            PartnershipInquiryStatus status,
            Pageable pageable
    );

    Page<PartnershipInquiry> findByFacilityNameContainingIgnoreCase(
            String keyword,
            Pageable pageable
    );

    Page<PartnershipInquiry>
    findByStatusAndFacilityNameContainingIgnoreCase(
            PartnershipInquiryStatus status,
            String keyword,
            Pageable pageable
    );
}