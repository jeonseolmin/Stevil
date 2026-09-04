package com.my.stevil_back.ad.service;

import com.my.stevil_back.ad.dto.AdDto;
import com.my.stevil_back.ad.entity.AdRequest;
import com.my.stevil_back.ad.enums.AdStatus;
import com.my.stevil_back.ad.repository.AdRequestRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdService {

    private final AdRequestRepository adRequestRepository;
    private final UserRepository userRepository;

    // 1. 의사: 광고 신청 (Create)
    @Transactional
    public AdDto.Response applyForAd(Long doctorId, AdDto.CreateRequest request) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 의사 계정입니다."));

        AdRequest adRequest = AdRequest.builder()
                .doctor(doctor)
                .adType(request.adType())
                .build();

        AdRequest savedAd = adRequestRepository.save(adRequest);
        return convertToResponseDto(savedAd);
    }

    // 2. 관리자: 대기 중인 광고 신청 목록 조회 (Read)
    @Transactional(readOnly = true)
    public List<AdDto.Response> getPendingRequests() {
        return adRequestRepository.findByStatus(AdStatus.PENDING).stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }

    // 3. 관리자: 광고 승인 (Update)
    @Transactional
    public AdDto.Response approveAd(Long adId, AdDto.ApproveRequest request) {
        AdRequest adRequest = adRequestRepository.findById(adId)
                .orElseThrow(() -> new IllegalArgumentException("해당 광고 신청건을 찾을 수 없습니다."));

        // 엔티티의 비즈니스 메서드 호출하여 상태 변경
        adRequest.approveAd(request.startDate(), request.endDate());

        return convertToResponseDto(adRequest);
    }

    // 4. 관리자: 광고 거절 (Update)
    @Transactional
    public AdDto.Response rejectAd(Long adId, AdDto.RejectRequest request) {
        AdRequest adRequest = adRequestRepository.findById(adId)
                .orElseThrow(() -> new IllegalArgumentException("해당 광고 신청건을 찾을 수 없습니다."));

        // 엔티티의 비즈니스 메서드 호출하여 상태 변경 및 사유 기록
        adRequest.rejectAd(request.adminFeedback());

        return convertToResponseDto(adRequest);
    }

    @Transactional(readOnly = true)
    public List<AdDto.Response> getMyAds(Long doctorId) {
        return adRequestRepository.findByDoctorIdOrderByIdDesc(doctorId).stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }

    // 활성화된 전체 광고 조회 (환자 화면용)
    @Transactional(readOnly = true)
    public List<AdDto.Response> getActiveAds() {
        LocalDate today = LocalDate.now();
        return adRequestRepository.findActiveAds(today).stream()
                .map(this::convertToResponseDto)
                .collect(Collectors.toList());
    }

    // 엔티티를 응답용 DTO로 변환하는 헬퍼 메서드
    private AdDto.Response convertToResponseDto(AdRequest ad) {
        return new AdDto.Response(
                ad.getId(),
                ad.getDoctor().getNickname(),
                ad.getAdType(),
                ad.getStatus(),
                ad.getStartDate(),
                ad.getEndDate(),
                ad.getAdminFeedback()
        );
    }
}