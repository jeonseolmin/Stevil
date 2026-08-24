package com.my.stevil_back.support.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record InquiryAnswerRequest(

        @NotBlank(message = "답변 내용은 필수입니다.")
        @Size(max = 5000, message = "답변은 5000자 이하여야 합니다.")
        String answer
) {
}