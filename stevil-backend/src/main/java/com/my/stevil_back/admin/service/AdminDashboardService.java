package com.my.stevil_back.admin.service;

import com.my.stevil_back.common.time.KoreaTime;
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
        // created_at 은 서버 시간대(운영 UTC)로 저장되므로 KST 하루 경계를 그 기준으로 바꿔 비교한다.
        LocalDateTime startOfToday = KoreaTime.toServer(today.atStartOfDay());
        LocalDateTime startOfTomorrow = KoreaTime.toServer(today.plusDays(1).atStartOfDay());

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