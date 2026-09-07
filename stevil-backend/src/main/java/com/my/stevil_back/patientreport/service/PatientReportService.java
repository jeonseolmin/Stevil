package com.my.stevil_back.patientreport.service;

import com.my.stevil_back.patientreport.entity.PatientReport;
import com.my.stevil_back.patientreport.repository.PatientReportRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PatientReportService {

    private final PatientReportRepository patientReportRepository;
    private final UserRepository userRepository;

    // 환자가 의사에게 리포트 전송
    @Transactional
    public void sendReport(Long patientId, String aiSummary) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("환자 정보를 찾을 수 없습니다."));

        User doctor = patient.getAttendingDoctor();
        if (doctor == null) {
            throw new IllegalArgumentException("등록된 주치의가 없습니다. 마이페이지에서 먼저 등록해주세요.");
        }

        PatientReport report = PatientReport.builder()
                .patient(patient)
                .doctor(doctor)
                .aiSummary(aiSummary)
                .status("UNREAD")
                .build();

        patientReportRepository.save(report);
    }

    // 의사가 본인에게 온 리포트 조회
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getReportsForDoctor(Long doctorId) {
        return patientReportRepository.findByDoctorIdOrderByIdDesc(doctorId).stream()
                .map(r -> {
                    User p = r.getPatient();
                    int age = p.getBirthDate() != null ? Period.between(p.getBirthDate(), LocalDate.now()).getYears() : 0;
                    
                    String genderCode = "UNKNOWN";
                    if (p.getSex() != null) {
                        String s = p.getSex().name().toUpperCase();
                        if (s.equals("MALE") || s.equals("M")) genderCode = "M";
                        else if (s.equals("FEMALE") || s.equals("F")) genderCode = "F";
                    }

                    return Map.<String, Object>of(
                            "id", r.getId(),
                            "patientName", p.getNickname(),
                            "patientAge", age,
                            "patientGender", genderCode,
                            "sentAt", r.getCreatedAt().toLocalDate().toString(),
                            "aiSummary", r.getAiSummary(),
                            "status", r.getStatus()
                    );
                }).collect(Collectors.toList());
    }
}