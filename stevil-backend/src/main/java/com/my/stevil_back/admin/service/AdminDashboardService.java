package com.my.stevil_back.admin.service;

import com.my.stevil_back.admin.dto.response.AdminDashboardResponse;
import com.my.stevil_back.exercise.repository.UserExerciseLogRepository;
import com.my.stevil_back.medical.repository.InjectionLogRepository;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

    private final UserRepository userRepository;
    private final InjectionLogRepository injectionLogRepository;
    private final UserExerciseLogRepository userExerciseLogRepository;

    public AdminDashboardResponse getDashboard() {
        LocalDate today = LocalDate.now(KOREA_ZONE);
        LocalDateTime startOfToday = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();

        long totalUsers = userRepository.count();

        long newUsersToday =
                userRepository.countByCreatedAtGreaterThanEqualAndCreatedAtLessThan(
                        startOfToday,
                        startOfTomorrow
                );

        long completedOnboardingUsers =
                userRepository.countByOnboardingCompletedTrue();

        long adminUsers =
                userRepository.countByRole(UserRole.ROLE_ADMIN);

        long totalInjectionLogs =
                injectionLogRepository.count();

        long totalExerciseLogs =
                userExerciseLogRepository.count();

        return new AdminDashboardResponse(
                totalUsers,
                newUsersToday,
                completedOnboardingUsers,
                adminUsers,
                totalInjectionLogs,
                totalExerciseLogs,
                LocalDateTime.now(KOREA_ZONE)
        );
    }
}