package com.my.stevil_back.report.repository;

import com.my.stevil_back.report.entity.*;
import com.my.stevil_back.report.entity.enumType.ReportCategory;
import com.my.stevil_back.report.entity.enumType.ReportStatus;
import com.my.stevil_back.report.entity.enumType.ReportTargetType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReportRepository
        extends JpaRepository<Report, Long> {

    boolean existsByReporterEmailAndTargetTypeAndTargetId(
            String reporterEmail,
            ReportTargetType targetType,
            Long targetId
    );

    @Query("""
            SELECT r
            FROM Report r
            WHERE (:status IS NULL OR r.status = :status)
              AND (:targetType IS NULL
                   OR r.targetType = :targetType)
              AND (:category IS NULL
                   OR r.category = :category)
            """)
    Page<Report> searchForAdmin(
            @Param("status") ReportStatus status,
            @Param("targetType") ReportTargetType targetType,
            @Param("category") ReportCategory category,
            Pageable pageable
    );

    long countByStatus(ReportStatus status);
}