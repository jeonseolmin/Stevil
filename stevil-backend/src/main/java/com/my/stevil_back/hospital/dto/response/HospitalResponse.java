package com.my.stevil_back.hospital.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record HospitalResponse(
        String name,
        String category,
        String address,
        String roadAddress,
        String telephone,
        Double latitude,
        Double longitude,
        Double distanceKm,
        String naverPlaceUrl,
        // 필드명을 isPartner로 지으면 Jackson의 getter is-접두사 처리 관례상
        // JSON 키가 "partner"로 바뀔 수 있어, 원치 않는 키 변경을 막기 위해
        // record 컴포넌트명은 partner로 두고 JSON 키만 명시적으로 고정한다.
        @JsonProperty("isPartner") boolean partner
) {
}