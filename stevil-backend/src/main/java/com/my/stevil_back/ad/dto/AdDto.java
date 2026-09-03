package com.my.stevil_back.ad.dto;

import com.my.stevil_back.ad.enums.AdStatus;
import com.my.stevil_back.ad.enums.AdType;
import java.time.LocalDate;

public class AdDto {

    // 의사가 광고를 신청할 때 보내는 데이터
    public record CreateRequest(AdType adType) {}

    // 관리자가 승인할 때 보내는 데이터 (노출 기간)
    public record ApproveRequest(LocalDate startDate, LocalDate endDate) {}

    // 관리자가 거절할 때 보내는 데이터 (거절 사유)
    public record RejectRequest(String adminFeedback) {}

    // 프론트엔드로 반환해 줄 광고 정보 응답 데이터
    public record Response(
            Long id,
            String doctorName, // 의사 이름 (조인해서 가져옴)
            AdType adType,
            AdStatus status,
            LocalDate startDate,
            LocalDate endDate,
            String adminFeedback
    ) {}
}