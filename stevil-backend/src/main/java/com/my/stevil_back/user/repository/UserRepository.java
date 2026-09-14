package com.my.stevil_back.user.repository;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);
    Optional<User> findByDoctorCode(String doctorCode);

    long countByRole(UserRole role);

    long countByOnboardingCompletedTrue();

    long countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
            LocalDateTime start,
            LocalDateTime end
    );

    long countByAttendingDoctorId(Long doctorId);
    List<User> findByAttendingDoctorId(Long doctorId);

    @Query("""
            SELECT u
            FROM User u
            WHERE :keyword IS NULL
               OR LOWER(u.email) LIKE :keyword
               OR LOWER(u.nickname) LIKE :keyword
            """)
    Page<User> searchForAdmin(
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT u
        FROM User u
        WHERE u.id = :id
        """)
    Optional<User> findByIdForUpdate(
            @Param("id") Long id
    );
}