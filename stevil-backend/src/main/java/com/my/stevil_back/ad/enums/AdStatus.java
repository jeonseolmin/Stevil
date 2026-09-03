package com.my.stevil_back.ad.enums;

public enum AdStatus {
    PENDING,     // 관리자 승인 대기 중
    APPROVED,    // 승인 완료 (광고 진행 중)
    REJECTED,    // 승인 거절 (사유 포함)
    EXPIRED      // 광고 기간 만료
}
