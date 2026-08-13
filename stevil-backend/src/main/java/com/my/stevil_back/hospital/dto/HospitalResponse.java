package com.my.stevil_back.hospital.dto;

public record HospitalResponse(
        String name,
        String category,
        String address,
        String roadAddress,
        String telephone,
        Double latitude,
        Double longitude,
        Double distanceKm,
        String naverPlaceUrl
) {
}