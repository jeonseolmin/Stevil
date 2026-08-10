package com.my.stevil_back.user.dto;

import com.my.stevil_back.user.entity.enumType.UserRole;

public record UserMeResponse(
        Long id,
        String email,
        String nickname,
        String profileImage,
        UserRole role
) {
}