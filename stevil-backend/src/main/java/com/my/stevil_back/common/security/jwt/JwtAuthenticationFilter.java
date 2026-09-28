package com.my.stevil_back.common.security.jwt;

import com.my.stevil_back.common.config.SecurityUrls;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorization = request.getHeader("Authorization");

        if (authorization == null
                || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorization.substring(7);

        // 토큰은 한 번만 파싱한다. 만료·형식 오류·서명 불일치·미지원(alg=none)은 JwtException,
        // 빈 토큰은 IllegalArgumentException — 어느 쪽이든 500이 아니라 인증 실패(401)다.
        // (이 필터는 ExceptionTranslationFilter보다 앞이라 여기서 던지면 /error로 빠져 500이 된다.)
        Claims claims;

        try {
            claims = jwtUtil.parseClaims(token);
        } catch (JwtException | IllegalArgumentException e) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String userEmail = claims.get("email", String.class);

        if (userEmail == null || userEmail.isBlank()) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        User user = userRepository.findByEmail(userEmail)
                .orElse(null);

        if (user == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        if (user.isSuspended()) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"message\":\"정지된 계정입니다.\"}"
            );
            return;
        }

        // 온보딩 미완료 사용자는 로그인 필요(USER_URLS) 영역에 온보딩 제출/본인 정보 조회
        // 외에는 들어갈 수 없다. 공개 API(permitAll)는 원래 비회원도 접근 가능하므로
        // 대상에서 제외한다 — 구글 로그인 직후 발급된 토큰으로 상세 정보 입력 없이
        // 다른 페이지에 진입할 수 있던 문제(뒤로가기 시 로그인 상태 유지)를 서버에서 막는다.
        // 관리자/의사 계정은 프론트(OAuthSuccessPage)에서 이미 온보딩과 무관하게
        // 각자의 대시보드로 보내므로 이 게이트에서도 동일하게 제외한다.
        boolean requiresOnboarding = user.getRole() == UserRole.ROLE_USER;

        if (requiresOnboarding
                && !user.isOnboardingCompleted()
                && isMemberOnlyPath(request)
                && !isOnboardingAllowedPath(request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"message\":\"온보딩을 먼저 완료해주세요.\"}"
            );
            return;
        }

        CustomUserDetails userDetails =
                new CustomUserDetails(user);

        Authentication authentication =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

        SecurityContextHolder.getContext()
                .setAuthentication(authentication);

        filterChain.doFilter(request, response);
    }

    private boolean isOnboardingAllowedPath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.equals("/api/users/me") || uri.equals("/api/onboarding");
    }

    private boolean isMemberOnlyPath(HttpServletRequest request) {
        String uri = request.getRequestURI();

        for (String pattern : SecurityUrls.USER_URLS) {
            if (pathMatcher.match(pattern, uri)) {
                return true;
            }
        }

        return false;
    }
}