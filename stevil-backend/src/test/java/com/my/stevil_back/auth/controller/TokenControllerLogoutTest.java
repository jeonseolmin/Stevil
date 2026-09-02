package com.my.stevil_back.auth.controller;

import com.my.stevil_back.common.security.refresh.service.RefreshTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TokenControllerLogoutTest {
    @Test
    void logoutClearsOAuthSessionEvenWithoutRefreshCookie() {
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        var session = (MockHttpSession) request.getSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", "existing OAuth session");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("test-user", null));
        try {
            var controller = new TokenController(null, null, mock(RefreshTokenService.class));
            assertEquals(204, controller.logout(null, request, response).getStatusCode().value());
            assertTrue(session.isInvalid());
            assertNull(SecurityContextHolder.getContext().getAuthentication());
            var cookies = response.getHeaders("Set-Cookie");
            assertTrue(cookies.stream().anyMatch(value -> value.startsWith("refreshToken=") && value.contains("Max-Age=0")));
            assertTrue(cookies.stream().anyMatch(value -> value.startsWith("JSESSIONID=") && value.contains("Max-Age=0")));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
