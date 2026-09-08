package com.my.stevil_back.patientreport.repository;

import com.my.stevil_back.patientreport.entity.PatientReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PatientReportRepository extends JpaRepository<PatientReport, Long> {
    // 의사 ID로 받은 리포트 목록을 최신순으로 조회
    List<PatientReport> findByDoctorIdOrderByIdDesc(Long doctorId);
    long countByDoctorIdAndStatus(Long doctorId, String status);
}