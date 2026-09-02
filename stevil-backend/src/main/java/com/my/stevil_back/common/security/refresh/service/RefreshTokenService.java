package com.my.stevil_back.common.security.refresh.service;

import com.my.stevil_back.common.security.jwt.JwtProperties;
import com.my.stevil_back.common.security.refresh.entity.RefreshToken;
import com.my.stevil_back.common.security.refresh.repository.RefreshTokenRepository;
import com.my.stevil_back.common.security.refresh.util.RefreshTokenGenerator;
import com.my.stevil_back.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RefreshTokenService {

    private final RefreshTokenRepository
            refreshTokenRepository;

    private final RefreshTokenGenerator
            refreshTokenGenerator;

    private final JwtProperties jwtProperties;

    @Transactional
    public String create(User user) {

        String rawToken =
                refreshTokenGenerator.generate();

        String tokenHash =
                refreshTokenGenerator.hash(
                        rawToken
                );

        LocalDateTime expiresAt =
                LocalDateTime.now()
                        .plusSeconds(
                                jwtProperties
                                        .getRefreshExpiration()
                                        / 1000
                        );

        RefreshToken refreshToken =
                RefreshToken.builder()
                        .user(user)
                        .tokenHash(tokenHash)
                        .expiresAt(expiresAt)
                        .build();

        refreshTokenRepository.save(
                refreshToken
        );

        return rawToken;
    }

    /**
     * 기존 Refresh Token을 검증하고 폐기합니다.
     *
     * 새 토큰은 Controller/상위 인증 Service에서
     * 다시 발급합니다.
     */
    @Transactional
    public User consume(
            String rawToken
    ) {
        String tokenHash =
                refreshTokenGenerator.hash(
                        rawToken
                );

        RefreshToken refreshToken =
                refreshTokenRepository
                        .findByTokenHashWithUser(
                                tokenHash
                        )
                        .orElseThrow(
                                () ->
                                        new ResponseStatusException(
                                                HttpStatus.UNAUTHORIZED,
                                                "유효하지 않은 Refresh Token입니다."
                                        )
                        );

        /*
         * 이미 사용된 Refresh Token 재사용
         */
        if (refreshToken.isRevoked()) {

            revokeAll(
                    refreshToken.getUser()
            );

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "이미 사용된 Refresh Token입니다. 다시 로그인해 주세요."
            );
        }

        if (refreshToken.isExpired()) {

            refreshToken.revoke();

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh Token이 만료되었습니다."
            );
        }

        /*
         * Rotation:
         * R1 사용 시 R1 즉시 폐기
         */
        refreshToken.revoke();

        return refreshToken.getUser();
    }

    @Transactional
    public void revokeAll(User user) {

        refreshTokenRepository
                .findAllByUserAndRevokedAtIsNull(user)
                .forEach(
                        RefreshToken::revoke
                );
    }
}