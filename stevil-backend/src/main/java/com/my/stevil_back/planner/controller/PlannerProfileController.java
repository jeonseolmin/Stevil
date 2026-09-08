package com.my.stevil_back.planner.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.planner.dto.response.PlannerProfileResponse;
import com.my.stevil_back.planner.service.PlannerProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planner/profile")
@RequiredArgsConstructor
public class PlannerProfileController {
    private final PlannerProfileService plannerProfileService;

    @GetMapping
    public PlannerProfileResponse get(@AuthenticationPrincipal CustomUserDetails principal) {
        return plannerProfileService.get(principal.getUserId());
    }
}
