package com.my.stevil_back.dashboard.dto;

import com.my.stevil_back.user.entity.UserWeight;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RecentWeightResponse(
        BigDecimal weightKg,
        LocalDateTime recordedAt
) {

    public static RecentWeightResponse from(
            UserWeight userWeight
    ) {
        return new RecentWeightResponse(
                userWeight.getWeight(),
                userWeight.getRecordedAt()
        );
    }
}