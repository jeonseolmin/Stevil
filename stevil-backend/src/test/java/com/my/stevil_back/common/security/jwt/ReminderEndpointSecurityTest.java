package com.my.stevil_back.common.security.jwt;

import com.my.stevil_back.common.config.SecurityConfig;
import com.my.stevil_back.common.security.oauth.handler.OAuth2FailureHandler;
import com.my.stevil_back.common.security.oauth.handler.OAuth2SuccessHandler;
import com.my.stevil_back.common.security.oauth.service.CustomOAuth2UserService;
import com.my.stevil_back.reminder.controller.ReminderController;
import com.my.stevil_back.reminder.dto.ReminderRequests;
import com.my.stevil_back.reminder.entity.enumType.ReminderType;
import com.my.stevil_back.reminder.service.ReminderService;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/* /api/reminders/** 가 인증 필요이고 사용자 ID 는 인증 정보에서만 오는지 확인한다. 서비스는 mock. */
@WebMvcTest(controllers = ReminderController.class)
@Import({SecurityConfig.class, JwtUtil.class, JwtProperties.class})
@TestPropertySource(properties = {
        "spring.jwt.secret=" + JwtTestTokens.SECRET,
        "spring.jwt.access-expiration=" + JwtTestTokens.ACCESS_EXPIRATION_MS,
        "app.frontend-url=http://localhost:3000",
        "app.upload-dir=build/test-uploads"
})
class ReminderEndpointSecurityTest {

    private static final long ME_ID = 7L;
    private static final String CREATE_BODY =
            "{\"type\":\"WEIGHT\",\"scheduledTime\":\"08:00\",\"daysOfWeek\":[\"MONDAY\",\"FRIDAY\"],\"userId\":999}";

    @Autowired MockMvc mockMvc;

    @MockitoBean ReminderService reminderService;
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
    void unauthenticatedOrInvalidJwtIsRejected() throws Exception {
        mockMvc.perform(get("/api/reminders")).andExpect(status().is3xxRedirection());
        mockMvc.perform(post("/api/reminders").contentType(MediaType.APPLICATION_JSON).content(CREATE_BODY))
                .andExpect(status().is3xxRedirection());
        mockMvc.perform(get("/api/reminders").header("Authorization", "Bearer " + JwtTestTokens.malformed()))
                .andExpect(status().isUnauthorized());
        verify(reminderService, never()).create(any(), any());
    }

    @Test
    void createUsesAuthenticatedUserAndParsesBody() throws Exception {
        mockMvc.perform(post("/api/reminders").header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON).content(CREATE_BODY))
                .andExpect(status().isCreated());

        ArgumentCaptor<ReminderRequests.Create> request = ArgumentCaptor.forClass(ReminderRequests.Create.class);
        verify(reminderService).create(eq(ME_ID), request.capture());
        assertThat(request.getValue().type()).isEqualTo(ReminderType.WEIGHT);
        assertThat(request.getValue().scheduledTime()).isEqualTo(LocalTime.of(8, 0));
        assertThat(request.getValue().daysOfWeek()).containsExactly(DayOfWeek.MONDAY, DayOfWeek.FRIDAY);

        mockMvc.perform(get("/api/reminders").header("Authorization", bearer())).andExpect(status().isOk());
        verify(reminderService).list(ME_ID);
    }

    @Test
    void serviceErrorsKeepTheirStatus() throws Exception {
        when(reminderService.list(ME_ID)).thenReturn(List.of());
        org.mockito.Mockito.doThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST))
                .when(reminderService).delete(ME_ID, 5L);

        mockMvc.perform(delete("/api/reminders/5").header("Authorization", bearer()))
                .andExpect(status().isBadRequest());
    }
}
