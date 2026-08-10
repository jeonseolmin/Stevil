package com.my.stevil_back.user.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.dto.UserMeResponse;
import com.my.stevil_back.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<UserMeResponse> getMe(
            @AuthenticationPrincipal CustomUserDetails principal
    ) {
        User user = principal.getUser();

        return ResponseEntity.ok(
                new UserMeResponse(
                        user.getId(),
                        user.getEmail(),
                        user.getNickname(),
                        user.getProfileImage(),
                        user.getRole()
                )
        );
    }
}