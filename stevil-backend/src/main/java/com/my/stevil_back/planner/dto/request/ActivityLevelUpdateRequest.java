package com.my.stevil_back.planner.dto.request;

import com.my.stevil_back.user.entity.enumType.ActivityLevel;
import jakarta.validation.constraints.NotNull;

public record ActivityLevelUpdateRequest(

        @NotNull(message = "activityLevel은 필수입니다.")
        ActivityLevel activityLevel
) {
}
