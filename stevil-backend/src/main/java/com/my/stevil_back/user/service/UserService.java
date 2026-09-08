package com.my.stevil_back.user.service;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    // 환자가 의사 코드를 입력해 주치의로 등록하는 기능
    @Transactional
    public void registerAttendingDoctor(Long patientId, String doctorCode) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new IllegalArgumentException("환자 계정을 찾을 수 없습니다."));

        User doctor = userRepository.findByDoctorCode(doctorCode)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 의사 코드입니다. 코드를 다시 확인해주세요."));

        // 코드가 의사 계정의 코드인지 검증
        if (!doctor.getRole().name().contains("DOCTOR")) {
            throw new IllegalArgumentException("해당 코드는 의사 전용 코드가 아닙니다.");
        }

        // 환자 정보에 주치의 업데이트
        patient.assignAttendingDoctor(doctor);
    }
}