package com.my.stevil_back.support.repository;

import com.my.stevil_back.support.entity.Inquiry;
import com.my.stevil_back.support.entity.enumType.InquiryCategory;
import com.my.stevil_back.support.entity.enumType.InquiryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InquiryRepository
        extends JpaRepository<Inquiry, Long> {

    @Query("""
            SELECT i
            FROM Inquiry i
            WHERE (:status IS NULL OR i.status = :status)
              AND (:category IS NULL OR i.category = :category)
              AND (
                    :keyword IS NULL
                    OR LOWER(i.title)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(i.content)
                        LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<Inquiry> searchForAdmin(
            @Param("status") InquiryStatus status,
            @Param("category") InquiryCategory category,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    long countByStatus(InquiryStatus status);
}