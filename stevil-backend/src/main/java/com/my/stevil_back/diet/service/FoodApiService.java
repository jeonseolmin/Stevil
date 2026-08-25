package com.my.stevil_back.diet.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class FoodApiService {

    public String searchFoodNutrients(String foodName) {
        RestTemplate restTemplate = new RestTemplate();

        String apiKey = "9deb2f7d4304fe4a23865fb2c185c97355831fd327796c9f656b362ebb3458b0";
        String apiUrl = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

        String requestUrl = UriComponentsBuilder.fromUriString(apiUrl)
                .queryParam("ServiceKey", apiKey)
                .queryParam("FOOD_NM_KR", foodName)
                .queryParam("pageNo", 1)
                .queryParam("numOfRows", 10)
                .queryParam("type", "json")
                .build()
                .encode()
                .toUriString();

        return restTemplate.getForObject(requestUrl, String.class);
    }
}