package com.my.stevil_back.weight.repository;

import com.my.stevil_back.weight.entity.WeightRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WeightRecordRepository extends JpaRepository<WeightRecord, Long> {

    // 가장 최근 기록 (현재 체중)
    Optional<WeightRecord> findTopByUserIdOrderByRecordedAtDesc(Long userId);

    // 가장 오래된 기록 (시작 체중)
    Optional<WeightRecord> findTopByUserIdOrderByRecordedAtAsc(Long userId);

    List<WeightRecord> findByUserIdOrderByRecordedAtAsc(Long userId);
}