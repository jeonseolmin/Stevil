import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface UserExerciseLogRepository extends JpaRepository<UserExerciseLog, Long> {

    // 유저의 특정 기간 운동 기록과 운동 이름을 함께 가져오는 쿼리 (N+1 방지)
    @Query("SELECT new com.my.stevil_back.exercise.dto.response.ExerciseLogDetailResponse(" +
            "l.id, e.name, l.durationMinutes, l.sets, l.burnedCalories, l.exerciseDate) " +
            "FROM UserExerciseLog l JOIN l.exercise e " +
            "WHERE l.userId = :userId AND l.exerciseDate BETWEEN :startDate AND :endDate")
    List<ExerciseLogDetailResponse> findDetailedLogs(
            @Param("userId") Long userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}