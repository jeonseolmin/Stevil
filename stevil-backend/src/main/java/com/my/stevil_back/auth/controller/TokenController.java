package com.my.stevil_back.auth.controller;

import com.my.stevil_back.auth.dto.response.TokenResponse;
import com.my.stevil_back.common.security.jwt.JwtProperties;
import com.my.stevil_back.common.security.jwt.JwtUtil;
import com.my.stevil_back.common.security.refresh.service.RefreshTokenService;
import com.my.stevil_back.user.entity.User;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class TokenController {

    private static final String REFRESH_COOKIE_NAME =
            "refreshToken";

    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @CookieValue(
                    name = REFRESH_COOKIE_NAME,
                    required = false
            )
            String refreshToken,

            HttpServletResponse response
    ) {
        if (
                refreshToken == null
                        || refreshToken.isBlank()
        ) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .build();
        }

        /*
         * 기존 Refresh Token 검증 + 폐기
         *
         * R1 → consume()
         * R1은 여기서 revoked 상태가 됩니다.
         */
        User user =
                refreshTokenService.consume(
                        refreshToken
                );

        /*
         * 새로운 Access Token 발급
         */
        String accessToken =
                jwtUtil.createAccessToken(
                        user.getEmail(),
                        user.getRole().name()
                );

        /*
         * Refresh Token Rotation
         *
         * 기존 R1 폐기 후 새로운 R2 발급
         */
        String newRefreshToken =
                refreshTokenService.create(
                        user
                );

        /*
         * 새 Refresh Token을
         * HttpOnly Cookie로 교체
         */
        addRefreshCookie(
                response,
                newRefreshToken
        );

        return ResponseEntity.ok(
                new TokenResponse(
                        accessToken
                )
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(
                    name = REFRESH_COOKIE_NAME,
                    required = false
            )
            String refreshToken,

            HttpServletRequest request,
            HttpServletResponse response
    ) {
        /*
         * Refresh Token이 존재한다면
         * 해당 Token을 consume해서 폐기합니다.
         *
         * 이미 만료되었거나 잘못된 Token이어도
         * 클라이언트 Cookie는 삭제하는 방향으로 갑니다.
         */
        if (
                refreshToken != null
                        && !refreshToken.isBlank()
        ) {
            try {
                User user =
                        refreshTokenService.consume(
                                refreshToken
                        );

                /*
                 * 해당 사용자의 활성 Refresh Token
                 * 전체 폐기
                 *
                 * 현재 Stevil에서는 "모든 기기 로그아웃"
                 * 정책으로 단순하게 가져갑니다.
                 */
                refreshTokenService.revokeAll(
                        user
                );

            } catch (Exception ignored) {
                /*
                 * 로그아웃은 Token 상태와 관계없이
                 * Cookie 제거까지 진행합니다.
                 */
            }
        }

        deleteRefreshCookie(response);
        // OAuth also establishes a session; clearing only refreshToken leaves it authenticated.
        var session = request.getSession(false);
        if (session != null) session.invalidate();
        SecurityContextHolder.clearContext();
        response.addHeader("Set-Cookie", ResponseCookie.from("JSESSIONID", "")
                .httpOnly(true).path("/").maxAge(0).sameSite("Lax").build().toString());

        return ResponseEntity
                .noContent()
                .build();
    }

    private void addRefreshCookie(
            HttpServletResponse response,
            String refreshToken
    ) {
        ResponseCookie cookie =
                ResponseCookie
                        .from(
                                REFRESH_COOKIE_NAME,
                                refreshToken
                        )
                        .httpOnly(true)

                        /*
                         * 로컬 개발 환경
                         * http://localhost 사용 시 false
                         *
                         * 운영 HTTPS에서는 반드시 true
                         */
                        .secure(false)

                        .sameSite("Lax")

                        /*
                         * refresh/logout 요청에만
                         * Cookie가 전송되도록 제한
                         */
                        .path("/api/auth")

                        .maxAge(
                                jwtProperties
                                        .getRefreshExpiration()
                                        / 1000
                        )
                        .build();

        response.addHeader(
                "Set-Cookie",
                cookie.toString()
        );
    }

    private void deleteRefreshCookie(
            HttpServletResponse response
    ) {
        ResponseCookie cookie =
                ResponseCookie
                        .from(
                                REFRESH_COOKIE_NAME,
                                ""
                        )
                        .httpOnly(true)
                        .secure(false)
                        .sameSite("Lax")
                        .path("/api/auth")
                        .maxAge(0)
                        .build();

        response.addHeader(
                "Set-Cookie",
                cookie.toString()
        );
    }
}
