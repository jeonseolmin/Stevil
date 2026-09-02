package com.my.stevil_back.planner;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;
public interface WeeklyPlanRepository extends JpaRepository<WeeklyPlan,Long> {
    Optional<WeeklyPlan> findByUserIdAndWeekStart(Long userId, LocalDate weekStart);
}
