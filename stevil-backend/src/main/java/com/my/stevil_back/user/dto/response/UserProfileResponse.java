package com.my.stevil_back.user.dto.response;

import java.time.LocalDate;
import java.util.List;

public record UserProfileResponse(
        Long userId,
        String nickname,
        String profileImage,
        LocalDate joinDate,
        Integer medicationDays, // 약 투여일 수
        String bio,
        int postCount,
        int commentCount
) {
}
