package com.my.stevil_back.user.repository;

import com.my.stevil_back.user.entity.UserWeight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserWeightRepository extends JpaRepository<UserWeight, Long> {
    // 특정 유저의 체중 기록 전체를 최신순으로 조회하는 메서드
    List<UserWeight> findByUserEmailOrderByRecordedAtDesc(Long userEmail);
}
