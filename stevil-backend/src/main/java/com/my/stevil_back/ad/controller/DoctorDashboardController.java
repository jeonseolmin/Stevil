package com.my.stevil_back.ad.controller;

import com.my.stevil_back.ad.service.DoctorDashboardService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctor")
@RequiredArgsConstructor
public class DoctorDashboardController {
    private final DoctorDashboardService doctorDashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(doctorDashboardService.getDashboardStats(userDetails.getUser().getId()));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Map<String, Object>>> getMyPatients(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(doctorDashboardService.getMyPatients(userDetails.getUser().getId()));
    }
}
