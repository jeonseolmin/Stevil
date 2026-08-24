package com.my.stevil_back.user.repository;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    long countByRole(UserRole role);

    long countByOnboardingCompletedTrue();

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime start,
            LocalDateTime end
    );

    @Query("""
            SELECT u
            FROM User u
            WHERE :keyword IS NULL
               OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(u.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    Page<User> searchForAdmin(
            @Param("keyword") String keyword,
            Pageable pageable
    );
}