package com.my.stevil_back.hospital.dto;

import java.util.List;

public record NaverLocalSearchResponse(
        Integer total,
        Integer start,
        Integer display,
        List<Item> items
) {

    public record Item(
            String title,
            String link,
            String category,
            String description,
            String telephone,
            String address,
            String roadAddress,
            String mapx,
            String mapy
    ) {
    }
}