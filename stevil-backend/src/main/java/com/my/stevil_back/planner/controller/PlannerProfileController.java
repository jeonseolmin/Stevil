package com.my.stevil_back.planner.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.planner.dto.request.ActivityLevelUpdateRequest;
import com.my.stevil_back.planner.dto.response.PlannerProfileResponse;
import com.my.stevil_back.planner.service.PlannerProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    /**
     * 현재 로그인 사용자의 activityLevel만 갱신한다(Phase15C).
     *
     * 다른 사용자의 activityLevel을 변경할 방법은 없다: 대상 사용자는
     * 항상 인증 principal에서만 가져오며, 요청 경로/본문으로 사용자
     * id를 받지 않는다.
     */
    @PatchMapping("/activity-level")
    public PlannerProfileResponse updateActivityLevel(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ActivityLevelUpdateRequest request
    ) {
        return plannerProfileService.updateActivityLevel(
                principal.getUserId(),
                request.activityLevel()
        );
    }
}
