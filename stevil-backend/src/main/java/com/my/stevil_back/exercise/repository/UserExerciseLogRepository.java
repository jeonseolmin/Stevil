package com.my.stevil_back.exercise.repository;

import com.my.stevil_back.exercise.entity.UserExerciseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface UserExerciseLogRepository extends JpaRepository<UserExerciseLog, Long> {
    // 💡 특정 유저의 특정 기간(예: 이번 주, 이번 달) 운동 기록 가져오기
    List<UserExerciseLog> findByUserIdAndExerciseDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
}