package com.my.stevil_back.user.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.dto.response.UserMeResponse;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

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
                        user.getRole(),
                        user.isOnboardingCompleted()
                )
        );
    }

    @PostMapping("/me/attending-doctor")
    public ResponseEntity<?> registerAttendingDoctor(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> request) {

        String doctorCode = request.get("doctorCode");

        // 현재 로그인한 환자의 ID와 프론트엔드에서 넘어온 의사 코드를 Service로 넘김
        userService.registerAttendingDoctor(userDetails.getUser().getId(), doctorCode);

        return ResponseEntity.ok(Map.of("message", "주치의 등록이 완료되었습니다."));
    }
}