package com.my.stevil_back.admin.dto.response;

import java.time.LocalDateTime;

public record AdminDashboardResponse(
        long totalUsers,
        long newUsersToday,
        long completedOnboardingUsers,
        long adminUsers,
        long totalInjectionLogs,
        long totalExerciseLogs,
        LocalDateTime generatedAt
) {
}