package com.my.stevil_back.ad.service;

import com.my.stevil_back.patientreport.repository.PatientReportRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import java.util.Map;

@org.springframework.stereotype.Service
@org.springframework.transaction.annotation.Transactional(readOnly = true)
@RequiredArgsConstructor
public class DoctorDashboardService {

    private final UserRepository userRepository;
    private final PatientReportRepository patientReportRepository;

    public Map<String, Object> getDashboardStats(
            Long doctorId) {


        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("의사 정보를 찾을 수 없습니다."));

        String doctorCode = doctor.getDoctorCode(); // DB에서 갓 꺼낸 따끈따끈한 코드

        // 1. 내 환자 수 계산
        long totalPatients = userRepository.countByAttendingDoctorId(doctorId);

        // 2. 미확인 리포트 수 계산 ("UNREAD" 상태인 것만 카운트)
        long pendingReports = patientReportRepository.countByDoctorIdAndStatus(doctorId, "UNREAD");

        // 3. 진행 중인 광고 수 (임시)
        long activeAds = 0;

        return Map.<String, Object>of(
                "doctorCode", doctorCode != null ? doctorCode : "코드 미발급",
                "totalPatients", totalPatients,
                "pendingReports", pendingReports,
                "activeAds", activeAds
        );
    }

    public java.util.List<Map<String, Object>> getMyPatients(
            Long doctorId) {

        java.util.List<User> patients = userRepository.findByAttendingDoctorId(doctorId);

        java.util.List<Map<String, Object>> response = patients.stream().map(p -> {
            int age = p.getBirthDate() != null ? java.time.Period.between(p.getBirthDate(), java.time.LocalDate.now()).getYears() : 0;

            String genderStr = p.getSex() != null ? p.getSex().name() : "UNKNOWN";

            return Map.<String, Object>of(
                    "id", p.getId(),
                    "nickname", p.getNickname(),
                    "email", p.getEmail(),
                    "age", age,
                    "gender", genderStr
            );
        }).collect(java.util.stream.Collectors.toList());

        return response;
    }
}