package com.my.stevil_back.kakao.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.kakao.dto.KakaoMessageRequest;
import com.my.stevil_back.kakao.service.KakaoMessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/kakao")
@RequiredArgsConstructor
public class KakaoMessageController {

    private final KakaoMessageService kakaoMessageService;

    @PostMapping("/message")
    public ResponseEntity<String> sendKakaoMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody KakaoMessageRequest request
    ) {
        // userDetails에서 현재 로그인한 유저의 ID를 뽑아 서비스로 전달
        kakaoMessageService.sendMessage(userDetails.getUser().getId(), request.getText());
        return ResponseEntity.ok("카카오톡 메시지 전송 성공");
    }
}