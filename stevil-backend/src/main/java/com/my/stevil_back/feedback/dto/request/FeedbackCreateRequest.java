package com.my.stevil_back.feedback.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record FeedbackCreateRequest(
        @Min(value = 1, message = "별점은 1점 이상이어야 합니다.")
        @Max(value = 5, message = "별점은 5점 이하이어야 합니다.")
        int rating,

        @NotBlank(message = "피드백 내용을 입력해 주세요.")
        String content
) {}