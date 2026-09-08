package com.my.stevil_back.content.repository;

import com.my.stevil_back.content.entity.HealthContent;
import com.my.stevil_back.content.entity.enumType.ContentCategory;
import com.my.stevil_back.content.entity.enumType.ContentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface HealthContentRepository
        extends JpaRepository<HealthContent, Long>,
        JpaSpecificationExecutor<HealthContent> {

    @Query("""
            SELECT hc
            FROM HealthContent hc
            JOIN FETCH hc.author
            WHERE hc.id = :contentId
            """)
    Optional<HealthContent> findDetailById(
            @Param("contentId") Long contentId
    );

    @EntityGraph(attributePaths = "author")
    Page<HealthContent> findAll(Pageable pageable);

    @EntityGraph(attributePaths = "author")
    Page<HealthContent> findByCategory(
            ContentCategory category,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "author")
    Page<HealthContent> findByStatus(
            ContentStatus status,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "author")
    Page<HealthContent> findByCategoryAndStatus(
            ContentCategory category,
            ContentStatus status,
            Pageable pageable
    );

    @EntityGraph(attributePaths = "author")
    @Query("""
            SELECT hc
            FROM HealthContent hc
            WHERE (
                LOWER(hc.title)
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(COALESCE(hc.summary, ''))
                    LIKE LOWER(CONCAT('%', :keyword, '%'))
            )
            AND (
                :category IS NULL
                OR hc.category = :category
            )
            AND (
                :status IS NULL
                OR hc.status = :status
            )
            """)
    Page<HealthContent> searchByKeyword(
            @Param("keyword") String keyword,
            @Param("category") ContentCategory category,
            @Param("status") ContentStatus status,
            Pageable pageable
    );
}