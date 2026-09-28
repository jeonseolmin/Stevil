package com.my.stevil_back.common.security.jwt;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/*
 * JwtAuthenticationFilter 단위 테스트 — 잘못된 JWT가 500(예외 전파)이 아니라 401이 되는지,
 * 헤더가 없거나 Bearer 형식이 아니면 기존처럼 그대로 통과하는지, 정지 계정은 403을 유지하는지 확인한다.
 */
class JwtAuthenticationFilterTest {

    private final JwtUtil jwtUtil = JwtTestTokens.newJwtUtil();
    private final UserRepository userRepository = mock(UserRepository.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwtUtil, userRepository);

    @BeforeEach
    void knownUser() {
        User user = User.builder().email(JwtTestTokens.EMAIL).role(UserRole.ROLE_USER).build();
        when(userRepository.findByEmail(JwtTestTokens.EMAIL)).thenReturn(Optional.of(user));
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private record Result(int status, boolean chainContinued, String body, boolean authenticated) {
    }

    /** authorization == null 이면 헤더를 아예 보내지 않는다. 예외가 전파되면 테스트가 실패한다(= 500 회귀). */
    private Result run(String authorization) {
        return run("GET", "/api/users/me", authorization);
    }

    private Result run(String method, String path, String authorization) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        if (authorization != null) {
            request.addHeader("Authorization", authorization);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        assertDoesNotThrow(() -> filter.doFilter(request, response, chain),
                "invalid JWT must not propagate an exception (would surface as HTTP 500)");

        try {
            return new Result(
                    response.getStatus(),
                    chain.getRequest() != null,
                    response.getContentAsString(),
                    SecurityContextHolder.getContext().getAuthentication() != null
            );
        } catch (java.io.UnsupportedEncodingException e) {
            throw new IllegalStateException(e);
        }
    }

    private void assertUnauthorized(String authorization) {
        Result result = run(authorization);

        assertEquals(401, result.status(), authorization);
        assertFalse(result.chainContinued(), "request must be stopped");
        assertFalse(result.authenticated());
    }

    @Test void noAuthorizationHeaderPassesThroughUnchanged() {
        Result result = run(null);

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
        assertFalse(result.authenticated());
        verifyNoInteractions(userRepository);
    }

    @Test void validTokenAuthenticates() {
        Result result = run("Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL));

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
        assertTrue(result.authenticated());
    }

    @Test void expiredTokenIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.expired(JwtTestTokens.EMAIL));
    }

    @Test void malformedTokenIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.malformed());
    }

    @Test void threeSegmentGarbageIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.garbageThreeSegments());
    }

    @Test void signatureMismatchIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.signatureMismatch(JwtTestTokens.EMAIL));
    }

    @Test void tamperedSignatureIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.tampered(JwtTestTokens.EMAIL));
    }

    @Test void unsignedAlgNoneIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.unsigned(JwtTestTokens.EMAIL));
    }

    @Test void emptyAndBlankBearerTokenIs401() {
        // 서블릿 컨테이너(Tomcat)는 헤더 끝 공백을 잘라 "Bearer"가 되어 "헤더 없음"처럼 처리된다.
        // 공백이 그대로 필터에 도달하는 경우(프록시/테스트)는 빈 토큰이며, 예외 전파(500)가 아니라 401 이어야 한다.
        assertUnauthorized("Bearer ");
        assertUnauthorized("Bearer    ");
    }

    @Test void lowercaseBearerSchemeIsIgnoredLikeNoHeader() {
        // 기존 동작 유지: 스킴은 대소문자를 구분해 "Bearer "만 인식한다(그 외는 헤더 없음과 동일).
        Result result = run("bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL));

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
        assertFalse(result.authenticated());
    }

    @Test void nonBearerSchemeIsIgnored() {
        Result result = run("Basic abc");

        assertTrue(result.chainContinued());
        assertFalse(result.authenticated());
    }

    @Test void missingEmailClaimIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.withoutEmailClaim());
        verifyNoInteractions(userRepository);
    }

    @Test void unknownUserIs401() {
        assertUnauthorized("Bearer " + JwtTestTokens.valid("ghost@example.com"));
    }

    @Test void onboardingIncompleteUserBlockedFromMemberOnlyPath() {
        // knownUser()는 onboardingCompleted 를 지정하지 않으므로 기본값(false).
        Result result = run("GET", "/api/dashboard", "Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL));

        assertEquals(403, result.status());
        assertFalse(result.chainContinued());
        assertTrue(result.body().contains("온보딩을 먼저 완료해주세요."));
        assertFalse(result.authenticated());
    }

    @Test void onboardingIncompleteUserCanStillSubmitOnboardingAndReadOwnProfile() {
        Result me = run("GET", "/api/users/me", "Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL));
        assertEquals(200, me.status());
        assertTrue(me.chainContinued());

        Result submit = run("POST", "/api/onboarding", "Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL));
        assertEquals(200, submit.status());
        assertTrue(submit.chainContinued());
    }

    @Test void onboardingIncompleteUserCanStillReachPublicPath() {
        // /api/community 는 permitAll — 온보딩 미완료라고 비회원보다 더 막혀서는 안 된다.
        Result result = run("GET", "/api/community", "Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL));

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
    }

    @Test void adminBypassesOnboardingGate() {
        User admin = User.builder().email("admin@example.com").role(UserRole.ROLE_ADMIN).build();
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));

        Result result = run("GET", "/api/dashboard", "Bearer " + JwtTestTokens.valid("admin@example.com"));

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
        assertTrue(result.authenticated());
    }

    @Test void doctorBypassesOnboardingGate() {
        User doctor = User.builder().email("doctor@example.com").role(UserRole.ROLE_DOCTOR).build();
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(doctor));

        Result result = run("GET", "/api/dashboard", "Bearer " + JwtTestTokens.valid("doctor@example.com"));

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
        assertTrue(result.authenticated());
    }

    @Test void onboardingCompleteUserReachesMemberOnlyPath() {
        User onboarded = User.builder().email("onboarded@example.com").role(UserRole.ROLE_USER)
                .onboardingCompleted(true).build();
        when(userRepository.findByEmail("onboarded@example.com")).thenReturn(Optional.of(onboarded));

        Result result = run("GET", "/api/dashboard", "Bearer " + JwtTestTokens.valid("onboarded@example.com"));

        assertEquals(200, result.status());
        assertTrue(result.chainContinued());
        assertTrue(result.authenticated());
    }

    @Test void suspendedUserKeeps403WithJsonMessage() {
        User suspended = User.builder().email("suspended@example.com").role(UserRole.ROLE_USER).build();
        suspended.suspend("test");
        when(userRepository.findByEmail("suspended@example.com")).thenReturn(Optional.of(suspended));

        Result result = run("Bearer " + JwtTestTokens.valid("suspended@example.com"));

        assertEquals(403, result.status());
        assertFalse(result.chainContinued());
        assertTrue(result.body().contains("정지된 계정입니다."));
        assertFalse(result.authenticated());
    }
}
