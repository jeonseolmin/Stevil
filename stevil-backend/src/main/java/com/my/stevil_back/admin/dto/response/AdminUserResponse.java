package com.my.stevil_back.admin.dto.response;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;

import java.time.LocalDateTime;

public record AdminUserResponse(
        Long id,
        String email,
        String nickname,
        UserRole role,
        boolean onboardingCompleted,
        boolean suspended,
        LocalDateTime suspendedAt,
        String suspensionReason,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole(),
                user.isOnboardingCompleted(),
                user.isSuspended(),
                user.getSuspendedAt(),
                user.getSuspensionReason(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}