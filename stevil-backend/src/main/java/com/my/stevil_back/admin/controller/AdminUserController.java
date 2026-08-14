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

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

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
}