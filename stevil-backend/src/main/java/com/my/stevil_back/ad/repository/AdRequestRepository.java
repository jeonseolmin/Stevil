package com.my.stevil_back.ad.repository;

import com.my.stevil_back.ad.entity.AdRequest;
import com.my.stevil_back.ad.enums.AdStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AdRequestRepository extends JpaRepository<AdRequest, Long> {

    // 관리자 대시보드용: 특정 상태(예: PENDING)인 신청 건만 모아보기
    List<AdRequest> findByStatus(AdStatus status);
}