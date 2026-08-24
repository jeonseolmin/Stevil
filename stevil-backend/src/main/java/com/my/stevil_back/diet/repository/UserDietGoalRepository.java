package com.my.stevil_back.diet.repository;

import com.my.stevil_back.diet.entity.UserDietGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserDietGoalRepository extends JpaRepository<UserDietGoal, Long> {
    // 특정 유저의 목표 및 알레르기 설정 불러오기
    Optional<UserDietGoal> findByUserId(Long userId);
}