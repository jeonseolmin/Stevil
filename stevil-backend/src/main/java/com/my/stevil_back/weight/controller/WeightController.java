package com.my.stevil_back.weight.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.weight.dto.WeightRequest;
import com.my.stevil_back.weight.service.WeightService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/weights")
@RequiredArgsConstructor
public class WeightController {

    private final WeightService weightService;

    @PostMapping
    public ResponseEntity<String> recordWeight(
            @RequestBody WeightRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        weightService.recordWeight(userDetails.getUserId(), request);
        return ResponseEntity.ok("체중 기록이 성공적으로 저장되었습니다.");
    }
}