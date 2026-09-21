package com.my.stevil_back.common.security.jwt;

import com.my.stevil_back.common.config.SecurityConfig;
import com.my.stevil_back.common.security.oauth.handler.OAuth2FailureHandler;
import com.my.stevil_back.common.security.oauth.handler.OAuth2SuccessHandler;
import com.my.stevil_back.common.security.oauth.service.CustomOAuth2UserService;
import com.my.stevil_back.post.controller.PostController;
import com.my.stevil_back.post.service.PostService;
import com.my.stevil_back.user.controller.UserController;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * 실제 SecurityConfig(필터 체인 + 인가 규칙)를 태워 /api/users/me(보호)와 /api/community(공개)를 확인한다.
 * DB 없이 실행되도록 저장소/서비스는 mock 이다.
 *
 * 정책: 잘못된 JWT가 명시적으로 붙어 있으면 공개 엔드포인트라도 401, 헤더가 없으면 기존 동작
 * (공개 200 / 보호는 기존 OAuth 로그인 흐름 = 리다이렉트), 정지 계정은 403 유지, 어떤 경우에도 500 없음.
 */
@WebMvcTest(controllers = {UserController.class, PostController.class})
@Import({SecurityConfig.class, JwtUtil.class, JwtProperties.class})
@TestPropertySource(properties = {
        "spring.jwt.secret=" + JwtTestTokens.SECRET,
        "spring.jwt.access-expiration=" + JwtTestTokens.ACCESS_EXPIRATION_MS,
        "app.frontend-url=http://localhost:3000",
        "app.upload-dir=build/test-uploads"
})
class JwtInvalidTokenEndpointTest {

    private static final String ME = "/api/users/me";
    private static final String COMMUNITY = "/api/community";

    @Autowired MockMvc mockMvc;

    @MockitoBean UserRepository userRepository;
    @MockitoBean UserService userService;
    @MockitoBean PostService postService;
    @MockitoBean OAuth2SuccessHandler oAuth2SuccessHandler;
    @MockitoBean OAuth2FailureHandler oAuth2FailureHandler;
    @MockitoBean CustomOAuth2UserService customOAuth2UserService;
    @MockitoBean ClientRegistrationRepository clientRegistrationRepository;
    // 메인 애플리케이션 클래스의 @EnableJpaAuditing 이 슬라이스에 딸려 들어오므로 JPA 메타모델은 mock 으로 대체한다(DB 불필요).
    @MockitoBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @BeforeEach
    void users() {
        when(userRepository.findByEmail(JwtTestTokens.EMAIL)).thenReturn(Optional.of(
                User.builder().email(JwtTestTokens.EMAIL).nickname("u").role(UserRole.ROLE_USER).build()));

        User suspended = User.builder().email("suspended@example.com").role(UserRole.ROLE_USER).build();
        suspended.suspend("test");
        when(userRepository.findByEmail("suspended@example.com")).thenReturn(Optional.of(suspended));
    }

    private MockHttpServletRequestBuilder request(String path, String authorization) {
        MockHttpServletRequestBuilder builder = get(path);
        return authorization == null ? builder : builder.header("Authorization", authorization);
    }

    /** 기존 OAuth 로그인 흐름 = 미인증 보호 요청은 로그인으로 리다이렉트(3xx). */
    private static final ResultMatcher LOGIN_REDIRECT = status().is3xxRedirection();

    private void check(String label, String authorization, ResultMatcher meExpected, ResultMatcher communityExpected)
            throws Exception {
        try {
            mockMvc.perform(request(ME, authorization)).andExpect(meExpected);
        } catch (AssertionError e) {
            throw new AssertionError(label + " -> " + ME + ": " + e.getMessage(), e);
        }
        try {
            mockMvc.perform(request(COMMUNITY, authorization)).andExpect(communityExpected);
        } catch (AssertionError e) {
            throw new AssertionError(label + " -> " + COMMUNITY + ": " + e.getMessage(), e);
        }
    }

    private void bothUnauthorized(String label, String authorization) throws Exception {
        check(label, authorization, status().isUnauthorized(), status().isUnauthorized());
    }

    @Test void noHeader_keepsExistingBehavior() throws Exception {
        // 공개 엔드포인트는 그대로 접근 가능, 보호 엔드포인트는 기존 인증 흐름(리다이렉트) — 401/500 아님
        check("no header", null, LOGIN_REDIRECT, status().isOk());
    }

    @Test void validToken_authenticates() throws Exception {
        check("valid", "Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL), status().isOk(), status().isOk());
    }

    @Test void expiredToken_is401() throws Exception {
        bothUnauthorized("expired", "Bearer " + JwtTestTokens.expired(JwtTestTokens.EMAIL));
    }

    @Test void malformedToken_is401() throws Exception {
        bothUnauthorized("malformed", "Bearer " + JwtTestTokens.malformed());
    }

    @Test void threeSegmentGarbage_is401() throws Exception {
        bothUnauthorized("a.b.c", "Bearer " + JwtTestTokens.garbageThreeSegments());
    }

    @Test void signatureMismatch_is401() throws Exception {
        bothUnauthorized("signature mismatch", "Bearer " + JwtTestTokens.signatureMismatch(JwtTestTokens.EMAIL));
    }

    @Test void tamperedSignature_is401() throws Exception {
        bothUnauthorized("tampered", "Bearer " + JwtTestTokens.tampered(JwtTestTokens.EMAIL));
    }

    @Test void unsignedAlgNone_is401() throws Exception {
        bothUnauthorized("alg=none", "Bearer " + JwtTestTokens.unsigned(JwtTestTokens.EMAIL));
    }

    @Test void emptyAndBlankBearerToken_is401() throws Exception {
        // MockMvc는 헤더 값을 그대로 전달한다. 실제 Tomcat은 끝 공백을 잘라 "헤더 없음"으로 처리한다(별도 확인).
        bothUnauthorized("Bearer <empty>", "Bearer ");
        bothUnauthorized("Bearer <blank>", "Bearer    ");
    }

    @Test void lowercaseBearer_isIgnoredLikeNoHeader() throws Exception {
        // 기존 동작 유지: 스킴은 대소문자 구분 — 소문자 bearer는 헤더 없음과 동일하게 취급
        check("lowercase bearer", "bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL), LOGIN_REDIRECT, status().isOk());
        check("lowercase bearer + garbage", "bearer " + JwtTestTokens.malformed(), LOGIN_REDIRECT, status().isOk());
    }

    @Test void missingEmailClaim_is401() throws Exception {
        bothUnauthorized("no email claim", "Bearer " + JwtTestTokens.withoutEmailClaim());
    }

    @Test void unknownUser_is401() throws Exception {
        bothUnauthorized("unknown user", "Bearer " + JwtTestTokens.valid("ghost@example.com"));
    }

    @Test void suspendedUser_keeps403() throws Exception {
        check("suspended", "Bearer " + JwtTestTokens.valid("suspended@example.com"),
                status().isForbidden(), status().isForbidden());
    }
}
