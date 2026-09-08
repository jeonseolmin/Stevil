package com.my.stevil_back.patientreport.repository;

import com.my.stevil_back.patientreport.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    // 환자 ID로 자신에게 온 피드백을 최신순으로 조회
    List<Feedback> findByPatientIdOrderByIdDesc(Long patientId);
}