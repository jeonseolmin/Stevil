package com.my.stevil_back.notification.repository;

import com.my.stevil_back.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("select n from Notification n where n.user.id = :userId")
    Page<Notification> findPageByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("select n from Notification n where n.user.id = :userId and n.readAt is null")
    Page<Notification> findUnreadPageByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query("select count(n) from Notification n where n.user.id = :userId and n.readAt is null")
    long countUnreadByUserId(@Param("userId") Long userId);

    /** 소유자 조건을 쿼리에 포함해, 다른 사용자의 알림은 존재 여부조차 알 수 없게 한다. */
    @Query("select n from Notification n where n.id = :id and n.user.id = :userId")
    Optional<Notification> findByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /** 이미 읽은 알림은 건드리지 않는다(최초 readAt 유지). 갱신된 행 수를 돌려준다. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Notification n set n.readAt = :now, n.updatedAt = :now "
            + "where n.user.id = :userId and n.readAt is null")
    int markAllRead(@Param("userId") Long userId, @Param("now") LocalDateTime now);
}
