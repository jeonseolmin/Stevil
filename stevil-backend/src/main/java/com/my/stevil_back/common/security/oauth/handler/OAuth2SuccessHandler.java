package com.my.stevil_back.common.security.oauth.handler;

import com.my.stevil_back.common.security.jwt.JwtProperties;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.common.security.refresh.service.RefreshTokenService;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {

    private static final String REFRESH_COOKIE_NAME =
            "refreshToken";

    private final RefreshTokenService refreshTokenService;
    private final JwtProperties jwtProperties;
    private final UserRepository userRepository;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        /*
         * 1. OAuth2 인증이 완료된 사용자 정보 조회
         */
        CustomUserDetails customUserDetails =
                (CustomUserDetails) authentication.getPrincipal();

        String email =
                customUserDetails.getEmail();

        User user =
                userRepository.findByEmail(email)
                        .orElseThrow(
                                () ->
                                        new IllegalStateException(
                                                "OAuth 로그인 사용자를 찾을 수 없습니다."
                                        )
                        );

        /*
         * 2. Refresh Token 발급
         *
         * RefreshTokenService 내부에서는
         * 실제 토큰 원문 대신 hash를 DB에 저장합니다.
         */
        String refreshToken =
                refreshTokenService.create(user);

        /*
         * 3. Refresh Token을 HttpOnly Cookie로 전달
         *
         * JavaScript에서는 읽을 수 없고,
         * /api/auth 경로 요청에만 전송됩니다.
         */
        ResponseCookie refreshCookie =
                ResponseCookie
                        .from(
                                REFRESH_COOKIE_NAME,
                                refreshToken
                        )
                        .httpOnly(true)

                        /*
                         * 로컬 개발 환경은 HTTP이므로 false.
                         *
                         * 운영 HTTPS 환경에서는 반드시 true로
                         * 변경해야 합니다.
                         */
                        .secure(false)

                        /*
                         * OAuth Redirect 이후에도
                         * 일반적인 same-site 요청에서
                         * Cookie 사용 가능.
                         */
                        .sameSite("Lax")

                        /*
                         * Refresh Token이 필요한 API에서만
                         * Cookie가 전달되도록 범위를 제한합니다.
                         */
                        .path("/api/auth")

                        /*
                         * application 설정의
                         * refresh-expiration은 ms 단위이므로
                         * Cookie maxAge에 맞춰 초 단위로 변환합니다.
                         */
                        .maxAge(
                                jwtProperties
                                        .getRefreshExpiration()
                                        / 1000
                        )
                        .build();

        response.addHeader(
                "Set-Cookie",
                refreshCookie.toString()
        );

        /*
         * 4. 기존에는
         *
         * /oauth-success?token=JWT
         *
         * 형태로 Access Token을 URL에 노출했습니다.
         *
         * 이제 URL에는 어떠한 Token도 전달하지 않습니다.
         */
        response.sendRedirect(
                frontendUrl + "/oauth-success"
        );
    }
}