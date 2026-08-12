package com.my.stevil_back.user.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.dto.request.OnboardingRequest;
import com.my.stevil_back.user.service.OnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;

    @PostMapping
    public ResponseEntity<Void> completeOnboarding(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody OnboardingRequest request
    ) {
        onboardingService.complete(
                principal.getUserId(),
                request
        );

        return ResponseEntity.noContent().build();
    }
}
