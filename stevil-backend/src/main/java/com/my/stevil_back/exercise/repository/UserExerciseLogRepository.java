package com.my.stevil_back.exercise.repository;

import com.my.stevil_back.exercise.dto.response.ExerciseLogDetailResponse;
import com.my.stevil_back.exercise.entity.UserExerciseLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface UserExerciseLogRepository extends JpaRepository<UserExerciseLog, Long> {

    List<UserExerciseLog> findByUserIdAndExerciseDateBetween(Long userId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT new com.my.stevil_back.exercise.dto.response.ExerciseLogDetailResponse(" +
            "l.id, e.name, l.durationMinutes, l.sets, l.burnedCalories, l.exerciseDate, e.category) " +
            "FROM UserExerciseLog l JOIN l.exercise e " +
            "WHERE l.userId = :userId AND l.exerciseDate BETWEEN :startDate AND :endDate")
    List<ExerciseLogDetailResponse> findDetailedLogs(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}