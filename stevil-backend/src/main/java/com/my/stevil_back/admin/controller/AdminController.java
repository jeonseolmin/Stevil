package com.my.stevil_back.admin.controller;

import com.my.stevil_back.admin.dto.response.AdminDashboardResponse;
import com.my.stevil_back.admin.service.AdminDashboardService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminDashboardService adminDashboardService;
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getAdmin(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                Map.of(
                        "userId", userDetails.getUserId(),
                        "email", userDetails.getEmail(),
                        "role", userDetails.getUser().getRole().name()
                )
        );
    }

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(
                adminDashboardService.getDashboard()
        );
    }
}