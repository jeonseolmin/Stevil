package com.my.stevil_back.feedback.controller;

import com.my.stevil_back.feedback.dto.request.FeedbackCreateRequest;
import com.my.stevil_back.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<Void> submitFeedback(
            @Valid @RequestBody FeedbackCreateRequest request
    ) {
        // 현재는 이메일을 통한 외부 접속(비로그인 상태)을 가정하여 null을 전달합니다.
        // 추후 JWT 인증이 들어간다면 SecurityContext에서 유저 ID를 꺼내 넣어주시면 됩니다.
        feedbackService.createFeedback(request, null);

        return ResponseEntity.ok().build();
    }
}