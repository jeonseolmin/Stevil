package com.my.stevil_back.ad.controller;

import com.my.stevil_back.ad.dto.AdDto;
import com.my.stevil_back.ad.service.AdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ads")
@RequiredArgsConstructor
public class AdController {

    private final AdService adService;

    // [의사 권한] 새로운 광고 제휴 신청
    @PostMapping("/request")
    public ResponseEntity<AdDto.Response> requestAd(
            @RequestAttribute("userId") Long doctorId, // JWT 필터에서 넘겨주는 유저 ID (프로젝트 설정에 맞게 변경)
            @RequestBody AdDto.CreateRequest request) {

        AdDto.Response response = adService.applyForAd(doctorId, request);
        return ResponseEntity.ok(response);
    }

    // [관리자 권한] 승인 대기 중인 광고 목록 조회
    @GetMapping("/admin/pending")
    public ResponseEntity<List<AdDto.Response>> getPendingAds() {
        return ResponseEntity.ok(adService.getPendingRequests());
    }

    // [관리자 권한] 광고 승인 처리
    @PatchMapping("/admin/{adId}/approve")
    public ResponseEntity<AdDto.Response> approveAd(
            @PathVariable Long adId,
            @RequestBody AdDto.ApproveRequest request) {

        AdDto.Response response = adService.approveAd(adId, request);
        return ResponseEntity.ok(response);
    }

    // [관리자 권한] 광고 거절(반려) 처리
    @PatchMapping("/admin/{adId}/reject")
    public ResponseEntity<AdDto.Response> rejectAd(
            @PathVariable Long adId,
            @RequestBody AdDto.RejectRequest request) {

        AdDto.Response response = adService.rejectAd(adId, request);
        return ResponseEntity.ok(response);
    }
}