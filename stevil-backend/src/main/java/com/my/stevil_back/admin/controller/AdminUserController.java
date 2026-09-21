package com.my.stevil_back.admin.controller;

import com.my.stevil_back.admin.dto.response.AdminUserResponse;
import com.my.stevil_back.admin.dto.request.AdminUserRoleRequest;
import com.my.stevil_back.admin.dto.request.AdminUserSuspensionRequest;
import com.my.stevil_back.admin.service.AdminUserService;
import com.my.stevil_back.common.notification.service.NotificationService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
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
    private final UserRepository userRepository;
    private final NotificationService notificationService;

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
    public ResponseEntity<Void> sendFeedbackRequest(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        // 카카오톡 또는 이메일로 자동 라우팅되는 통합 서비스 호출
        notificationService.sendFeedbackRequest(user);

        return ResponseEntity.ok().build();
    }
}