package com.my.stevil_back.user.repository;

import com.my.stevil_back.user.entity.UserWeight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserWeightRepository
        extends JpaRepository<UserWeight, Long> {
    Optional<UserWeight> findFirstByUserIdAndRecordedAtLessThanEqualOrderByRecordedAtDescIdDesc(
            Long userId, java.time.LocalDateTime recordedAt);

    // 사용자의 전체 체중 기록을 최신순으로 조회
    List<UserWeight> findByUserIdOrderByRecordedAtDesc(
            Long userId
    );

    // 가장 최근 체중 기록 한 건
    Optional<UserWeight> findFirstByUserIdOrderByRecordedAtDesc(
            Long userId
    );

    // 가장 오래된 체중 기록 한 건
    Optional<UserWeight> findFirstByUserIdOrderByRecordedAtAsc(
            Long userId
    );

    // 최근 체중 기록 7건
    List<UserWeight> findTop7ByUserIdOrderByRecordedAtDesc(
            Long userId
    );
}
