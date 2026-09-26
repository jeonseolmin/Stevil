package com.my.stevil_back.support.dto.response;

import com.my.stevil_back.common.time.KoreaTime;
import com.my.stevil_back.support.entity.Inquiry;
import com.my.stevil_back.support.entity.enumType.InquiryCategory;
import com.my.stevil_back.support.entity.enumType.InquiryStatus;

import java.time.LocalDateTime;

public record AdminInquiryResponse(
        Long id,
        Long userId,
        InquiryCategory category,
        String title,
        String content,
        InquiryStatus status,
        String answer,
        Long answeredBy,
        LocalDateTime answeredAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    public static AdminInquiryResponse from(Inquiry inquiry) {
        return new AdminInquiryResponse(
                inquiry.getId(),
                inquiry.getUserId(),
                inquiry.getCategory(),
                inquiry.getTitle(),
                inquiry.getContent(),
                inquiry.getStatus(),
                inquiry.getAnswer(),
                inquiry.getAnsweredBy(),
                KoreaTime.fromServer(inquiry.getAnsweredAt()),
                KoreaTime.fromServer(inquiry.getCreatedAt()),
                KoreaTime.fromServer(inquiry.getUpdatedAt())
        );
    }
}