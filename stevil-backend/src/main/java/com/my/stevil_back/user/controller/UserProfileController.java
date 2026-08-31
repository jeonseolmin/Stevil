package com.my.stevil_back.user.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.dto.response.UserProfileResponse;
import com.my.stevil_back.user.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@RequestParam("email") String email) {
        UserProfileResponse profile = userProfileService.getProfileByEmail(email);
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/profile/me")
    public ResponseEntity<UserProfileResponse> getMyProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        UserProfileResponse response = userProfileService.getProfileByEmail(userDetails.getEmail());
        return ResponseEntity.ok(response);
    }

    // 2. 한 줄 소개 수정
    @PutMapping("/profile/bio")
    public ResponseEntity<String> updateBio(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody java.util.Map<String, String> request) {

        userProfileService.updateUserBio(userDetails.getEmail(), request.get("bio"));
        return ResponseEntity.ok("소개가 업데이트되었습니다.");
    }
}