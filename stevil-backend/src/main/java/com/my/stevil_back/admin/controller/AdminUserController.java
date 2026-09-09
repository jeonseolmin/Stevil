package com.my.stevil_back.admin.controller;

import com.my.stevil_back.admin.dto.response.AdminUserResponse;
import com.my.stevil_back.admin.dto.request.AdminUserRoleRequest;
import com.my.stevil_back.admin.dto.request.AdminUserSuspensionRequest;
import com.my.stevil_back.admin.service.AdminUserService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.my.stevil_back.common.email.service.EmailService;

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;
    private final EmailService emailService;

    @GetMapping
    public ResponseEntity<Page<AdminUserResponse>> getUsers(
            @RequestParam(required = false) String keyword,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = DESC
            )
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                adminUserService.getUsers(keyword, pageable)
        );
    }

    @GetMapping("/{userId}")
    public ResponseEntity<AdminUserResponse> getUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(
                adminUserService.getUser(userId)
        );
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<AdminUserResponse> changeRole(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserRoleRequest request
    ) {
        return ResponseEntity.ok(
                adminUserService.changeRole(
                        admin.getUserId(),
                        userId,
                        request.role()
                )
        );
    }

    @PatchMapping("/{userId}/suspension")
    public ResponseEntity<AdminUserResponse> suspendUser(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long userId,
            @Valid @RequestBody AdminUserSuspensionRequest request
    ) {
        return ResponseEntity.ok(
                adminUserService.suspendUser(
                        admin.getUserId(),
                        userId,
                        request.reason()
                )
        );
    }

    @DeleteMapping("/{userId}/suspension")
    public ResponseEntity<AdminUserResponse> releaseSuspension(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(
                adminUserService.releaseSuspension(userId)
        );
    }

    @PostMapping("/{userId}/feedback-email")
    public ResponseEntity<Void> sendFeedbackEmail(@PathVariable Long userId) {
        // 유저 정보 조회
        AdminUserResponse user = adminUserService.getUser(userId);

        // 해당 유저의 이메일로 피드백 요청 발송
        String nickname = user.nickname() != null ? user.nickname() : "고객";
        emailService.sendFeedbackRequestEmail(user.email(), nickname);

        return ResponseEntity.ok().build();
    }
}