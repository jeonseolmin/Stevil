package com.my.stevil_back.ad.controller;

import com.my.stevil_back.ad.dto.AdDto;
import com.my.stevil_back.ad.service.AdService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/ads")
@RequiredArgsConstructor
public class AdController {

    private final AdService adService;

    // [의사 권한] 새로운 광고 제휴 신청
    @PostMapping("/request")
    public ResponseEntity<AdDto.Response> requestAd(
            Principal principal,
            @RequestBody AdDto.CreateRequest request) {

        // 1. 토큰이 없거나 잘못된 경우
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // 2. principal.getName()을 통해 JWT 필터가 넣어둔 식별자(PK 숫자)를 바로 꺼냅니다.
        Long doctorId;
        try {
            doctorId = Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("사용자 식별자가 숫자가 아닙니다: " + principal.getName());
        }

        // 3. 서비스 호출
        AdDto.Response response = adService.applyForAd(doctorId, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<AdDto.Response>> getMyAds(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Long doctorId;
        try {
            doctorId = Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("사용자 식별자가 올바르지 않습니다.");
        }

        return ResponseEntity.ok(adService.getMyAds(doctorId));
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

    @GetMapping("/active")
    public ResponseEntity<List<AdDto.Response>> getActiveAds() {
        return ResponseEntity.ok(adService.getActiveAds());
    }
}