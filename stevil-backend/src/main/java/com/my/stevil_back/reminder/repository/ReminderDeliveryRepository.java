package com.my.stevil_back.reminder.repository;

import com.my.stevil_back.reminder.entity.ReminderDelivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface ReminderDeliveryRepository extends JpaRepository<ReminderDelivery, Long> {

    @Query("select count(d) > 0 from ReminderDelivery d where d.reminder.id = :reminderId "
            + "and d.scheduledDate = :date and d.scheduledTime = :time")
    boolean existsOccurrence(@Param("reminderId") Long reminderId,
                             @Param("date") LocalDate date, @Param("time") LocalTime time);

    @Query("select d from ReminderDelivery d where d.reminder.id = :reminderId order by d.id")
    List<ReminderDelivery> findByReminderId(@Param("reminderId") Long reminderId);

    @Modifying
    @Query("delete from ReminderDelivery d where d.scheduledDate < :before")
    int deleteOlderThan(@Param("before") LocalDate before);
}
