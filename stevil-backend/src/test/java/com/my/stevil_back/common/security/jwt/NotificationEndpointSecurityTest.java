package com.my.stevil_back.common.security.jwt;

import com.my.stevil_back.common.config.SecurityConfig;
import com.my.stevil_back.common.security.oauth.handler.OAuth2FailureHandler;
import com.my.stevil_back.common.security.oauth.handler.OAuth2SuccessHandler;
import com.my.stevil_back.common.security.oauth.service.CustomOAuth2UserService;
import com.my.stevil_back.notification.controller.UserNotificationController;
import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import com.my.stevil_back.notification.service.UserDeviceService;
import com.my.stevil_back.notification.service.UserNotificationService;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * /api/notifications/** 가 실제 SecurityConfig 하에서 인증 필요(미인증=기존 정책의 3xx 로그인 리다이렉트, 잘못된 JWT=401)이고,
 * 로그인 사용자의 ID 는 항상 인증 정보에서만 오는지 확인한다. 서비스는 mock 이다.
 */
@WebMvcTest(controllers = UserNotificationController.class)
@Import({SecurityConfig.class, JwtUtil.class, JwtProperties.class})
@TestPropertySource(properties = {
        "spring.jwt.secret=" + JwtTestTokens.SECRET,
        "spring.jwt.access-expiration=" + JwtTestTokens.ACCESS_EXPIRATION_MS,
        "app.frontend-url=http://localhost:3000",
        "app.upload-dir=build/test-uploads"
})
class NotificationEndpointSecurityTest {

    private static final long ME_ID = 7L;
    private static final String TOKEN_BODY = "{\"token\":\"abc-token_1\",\"platform\":\"WEB\"}";

    @Autowired MockMvc mockMvc;

    @MockitoBean UserNotificationService notificationService;
    @MockitoBean UserDeviceService deviceService;
    @MockitoBean UserRepository userRepository;
    @MockitoBean OAuth2SuccessHandler oAuth2SuccessHandler;
    @MockitoBean OAuth2FailureHandler oAuth2FailureHandler;
    @MockitoBean CustomOAuth2UserService customOAuth2UserService;
    @MockitoBean ClientRegistrationRepository clientRegistrationRepository;
    @MockitoBean JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @BeforeEach
    void user() {
        User me = User.builder().email(JwtTestTokens.EMAIL).nickname("u").role(UserRole.ROLE_USER).build();
        ReflectionTestUtils.setField(me, "id", ME_ID);
        when(userRepository.findByEmail(JwtTestTokens.EMAIL)).thenReturn(Optional.of(me));
    }

    private static String bearer() {
        return "Bearer " + JwtTestTokens.valid(JwtTestTokens.EMAIL);
    }

    @Test
    void unauthenticatedRequestsAreNotServed() throws Exception {
        mockMvc.perform(get("/api/notifications")).andExpect(status().is3xxRedirection());
        mockMvc.perform(get("/api/notifications/unread-count")).andExpect(status().is3xxRedirection());
        mockMvc.perform(patch("/api/notifications/read-all")).andExpect(status().is3xxRedirection());
        mockMvc.perform(post("/api/notifications/token").contentType(MediaType.APPLICATION_JSON).content(TOKEN_BODY))
                .andExpect(status().is3xxRedirection());
        verify(deviceService, never()).register(any(), any(), any(), any());
    }

    @Test
    void invalidJwtIs401() throws Exception {
        mockMvc.perform(get("/api/notifications").header("Authorization", "Bearer " + JwtTestTokens.malformed()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications")
                        .header("Authorization", "Bearer " + JwtTestTokens.expired(JwtTestTokens.EMAIL)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loggedInUserIsTakenFromAuthenticationNotFromRequest() throws Exception {
        mockMvc.perform(get("/api/notifications/unread-count").header("Authorization", bearer()))
                .andExpect(status().isOk());
        verify(notificationService).unreadCount(ME_ID);

        // 본문에 userId 를 실어 보내도 무시되고, 서비스에는 인증된 사용자 ID 만 전달된다.
        mockMvc.perform(post("/api/notifications/token").header("Authorization", bearer())
                        .header("User-Agent", "UA")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"abc-token_1\",\"platform\":\"WEB\",\"userId\":999}"))
                .andExpect(status().isNoContent());
        verify(deviceService).register(ME_ID, "abc-token_1", DevicePlatform.WEB, "UA");

        mockMvc.perform(delete("/api/notifications/token").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"abc-token_1\"}"))
                .andExpect(status().isNoContent());
        verify(deviceService).unregister(ME_ID, "abc-token_1");
    }

    @Test
    void listAndReadAllUseAuthenticatedUser() throws Exception {
        when(notificationService.markAllRead(ME_ID)).thenReturn(3);

        mockMvc.perform(patch("/api/notifications/read-all").header("Authorization", bearer()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.updated").value(3));
        mockMvc.perform(get("/api/notifications?unreadOnly=true&page=1&size=5").header("Authorization", bearer()))
                .andExpect(status().isOk());
        verify(notificationService).list(ME_ID, true, 1, 5);
    }

    @Test
    void otherUsersNotificationIs404() throws Exception {
        when(notificationService.markRead(eq(ME_ID), eq(99L)))
                .thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));

        mockMvc.perform(patch("/api/notifications/99/read").header("Authorization", bearer()))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidTokenBodyIs400() throws Exception {
        mockMvc.perform(post("/api/notifications/token").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"\",\"platform\":\"WEB\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/notifications/token").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + "x".repeat(1025) + "\",\"platform\":\"WEB\"}"))
                .andExpect(status().isBadRequest());
        verify(deviceService, never()).register(any(), any(), any(), any());
    }
}
