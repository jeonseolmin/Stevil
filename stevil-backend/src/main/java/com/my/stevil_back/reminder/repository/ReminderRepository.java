package com.my.stevil_back.reminder.repository;

import com.my.stevil_back.reminder.entity.Reminder;
import com.my.stevil_back.reminder.entity.enumType.ReminderSource;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {

    interface Due {
        Long getId();

        Instant getNextFireAt();
    }

    /*
     * scheduler 후보 조회. next_fire_at 인덱스만 탄다(전체 사용자 scan 금지).
     * (nextFireAt, id) keyset 으로 한 tick 안에서 앞으로만 진행하므로, 계속 실패하거나 잠긴 앞쪽 행이
     * 뒤쪽 리마인더를 굶기지 않는다.
     */
    @Query("select r.id as id, r.nextFireAt as nextFireAt from Reminder r "
            + "where r.enabled = true and r.nextFireAt <= :now "
            + "and (r.nextFireAt > :afterFireAt or (r.nextFireAt = :afterFireAt and r.id > :afterId)) "
            + "order by r.nextFireAt, r.id")
    List<Due> findDue(@Param("now") Instant now, @Param("afterFireAt") Instant afterFireAt,
                      @Param("afterId") Long afterId, Pageable pageable);

    /** 회차 처리용 행 잠금. 다른 인스턴스가 처리 중이면 기다리지 않고 건너뛴다(SKIP LOCKED, timeout=-2). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "-2"))
    @Query("select r from Reminder r join fetch r.user where r.id = :id")
    Optional<Reminder> findByIdForUpdate(@Param("id") Long id);

    @Query("select r from Reminder r where r.user.id = :userId order by r.source, r.id")
    List<Reminder> findAllByUserId(@Param("userId") Long userId);

    @Query("select r from Reminder r where r.id = :id and r.user.id = :userId")
    Optional<Reminder> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /*
     * 사용자 수정(PATCH/enabled/DELETE)용 행 잠금. Planner 동기화·scheduler 와 같은 Reminder 행 잠금으로 직렬화해
     * 오래된 엔티티가 enabled/timeOverride 를 덮어쓰는 lost update 를 막는다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reminder r where r.id = :id and r.user.id = :userId")
    Optional<Reminder> findByIdAndUserIdForUpdate(@Param("id") Long id, @Param("userId") Long userId);

    /** Planner 동기화용. id 순서로 잠가 사용자 수정/scheduler 와 교착 없이 직렬화한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Reminder r where r.user.id = :userId and r.source = :source order by r.id")
    List<Reminder> findByUserIdAndSourceForUpdate(@Param("userId") Long userId, @Param("source") ReminderSource source);

    @Query("select r from Reminder r where r.user.id = :userId and r.source = :source")
    List<Reminder> findByUserIdAndSource(@Param("userId") Long userId, @Param("source") ReminderSource source);

    @Query("select count(r) from Reminder r where r.user.id = :userId and r.source = :source")
    long countByUserIdAndSource(@Param("userId") Long userId, @Param("source") ReminderSource source);
}
