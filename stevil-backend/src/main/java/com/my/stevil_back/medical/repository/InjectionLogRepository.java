package com.my.stevil_back.medical.repository;

import com.my.stevil_back.medical.entity.InjectionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InjectionLogRepository extends JpaRepository<InjectionLog, Long> {
    // 특정 유저의 기록을 최신순으로 조회 (리포트 및 타임라인용)
    List<InjectionLog> findByUserIdOrderByRecordDateDesc(Long userId);
}