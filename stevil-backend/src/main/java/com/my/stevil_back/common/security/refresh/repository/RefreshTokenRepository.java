package com.my.stevil_back.common.security.refresh.repository;

import com.my.stevil_back.common.security.refresh.entity.RefreshToken;
import com.my.stevil_back.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, Long> {

    @Query("""
            SELECT rt
            FROM RefreshToken rt
            JOIN FETCH rt.user
            WHERE rt.tokenHash = :tokenHash
            """)
    Optional<RefreshToken> findByTokenHashWithUser(
            @Param("tokenHash")
            String tokenHash
    );

    List<RefreshToken>
    findAllByUserAndRevokedAtIsNull(
            User user
    );
}