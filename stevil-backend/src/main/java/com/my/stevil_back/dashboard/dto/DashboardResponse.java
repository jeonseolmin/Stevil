package com.my.stevil_back.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(

        Long userId,

        String nickname,

        String profileImage,

        BigDecimal startWeightKg,

        BigDecimal currentWeightKg,

        BigDecimal targetWeightKg,

        BigDecimal lostWeightKg,

        BigDecimal remainingWeightKg,

        BigDecimal progressRate,

        List<RecentWeightResponse> recentWeights

) {
}