package com.my.stevil_back.diet.repository;

import com.my.stevil_back.diet.entity.DietRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface DietRecordRepository extends JpaRepository<DietRecord, Long> {
    // 특정 유저의 "특정 날짜(예: 오늘)" 식단 기록을 전부 가져오기
    List<DietRecord> findByUserIdAndRecordDate(Long userId, LocalDate recordDate);
}