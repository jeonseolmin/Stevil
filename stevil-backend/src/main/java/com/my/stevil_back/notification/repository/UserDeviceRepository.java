package com.my.stevil_back.notification.repository;

import com.my.stevil_back.notification.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

    Optional<UserDevice> findByFcmToken(String fcmToken);

    long countByUserId(Long userId);

    /** 오래 쓰지 않은 기기부터(같은 시각이면 먼저 등록된 것부터). */
    List<UserDevice> findByUserIdOrderByLastUsedAtAscIdAsc(Long userId);

    @Query("select d.fcmToken from UserDevice d where d.user.id = :userId")
    List<String> findTokensByUserId(@Param("userId") Long userId);

    /** 소유자 조건 포함 삭제. 지운 행 수를 돌려준다(없으면 0). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from UserDevice d where d.fcmToken = :token and d.user.id = :userId")
    int deleteByFcmTokenAndUserId(@Param("token") String token, @Param("userId") Long userId);
}
