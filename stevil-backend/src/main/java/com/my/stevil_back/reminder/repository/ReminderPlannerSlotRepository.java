package com.my.stevil_back.reminder.repository;

import com.my.stevil_back.reminder.entity.ReminderPlannerSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface ReminderPlannerSlotRepository extends JpaRepository<ReminderPlannerSlot, Long> {

    @Query("select s from ReminderPlannerSlot s where s.reminder.id = :reminderId and s.planDate >= :from order by s.planDate")
    List<ReminderPlannerSlot> findFrom(@Param("reminderId") Long reminderId, @Param("from") LocalDate from);

    @Modifying(flushAutomatically = true)
    @Query("delete from ReminderPlannerSlot s where s.reminder.id in :reminderIds and s.planDate between :from and :to")
    int deleteWeek(@Param("reminderIds") Collection<Long> reminderIds,
                   @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Modifying
    @Query("delete from ReminderPlannerSlot s where s.planDate < :before")
    int deleteOlderThan(@Param("before") LocalDate before);
}
