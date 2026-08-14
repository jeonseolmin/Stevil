package com.my.stevil_back.hospital.service;

import com.my.stevil_back.hospital.config.NaverSearchProperties;
import com.my.stevil_back.hospital.dto.response.HospitalResponse;
import com.my.stevil_back.hospital.dto.response.NaverLocalSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class HospitalSearchService {

    private static final Pattern HTML_TAG_PATTERN =
            Pattern.compile("<[^>]*>");

    private static final int DISPLAY_LIMIT = 5;
    private static final double EARTH_RADIUS_KM = 6371.0088;

    private final RestClient naverSearchRestClient;
    private final NaverSearchProperties properties;
    private final ObjectMapper objectMapper;

    public List<HospitalResponse> search(
            String keyword,
            Double currentLatitude,
            Double currentLongitude
    ) {
        if (!properties.isConfigured()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "네이버 지역검색 API 키가 설정되지 않았습니다."
            );
        }

        String normalizedKeyword = normalizeKeyword(keyword);

        try {
            String responseBody =
                    naverSearchRestClient
                            .get()
                            .uri(uriBuilder -> uriBuilder
                                    .path("/search/v1/local")
                                    .queryParam(
                                            "query",
                                            normalizedKeyword
                                    )
                                    .queryParam(
                                            "display",
                                            DISPLAY_LIMIT
                                    )
                                    .queryParam("start", 1)
                                    .queryParam("sort", "random")
                                    .queryParam("format", "json")
                                    .build()
                            )
                            .header(
                                    "X-NCP-APIGW-API-KEY-ID",
                                    properties.clientId()
                            )
                            .header(
                                    "X-NCP-APIGW-API-KEY",
                                    properties.clientSecret()
                            )
                            .retrieve()
                            .body(String.class);

            NaverLocalSearchResponse response =
                    objectMapper.readValue(
                            responseBody,
                            NaverLocalSearchResponse.class
                    );

            if (response == null || response.items() == null) {
                return List.of();
            }

            Comparator<HospitalResponse> comparator =
                    Comparator.comparing(
                            HospitalResponse::distanceKm,
                            Comparator.nullsLast(
                                    Double::compareTo
                            )
                    );

            return response.items()
                    .stream()
                    .map(item -> toHospital(
                            item,
                            currentLatitude,
                            currentLongitude
                    ))
                    .sorted(comparator)
                    .toList();

        } catch (JacksonException exception) {
            log.error(
                    "NAVER API HUB 응답 변환 실패",
                    exception
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "네이버 지역검색 응답을 처리하지 못했습니다.",
                    exception
            );

        } catch (RestClientResponseException exception) {
        log.error(
                "NAVER API HUB 연결 실패",
                exception
        );

        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "네이버 병원 검색 서비스에 연결하지 못했습니다.",
                exception
        );
    }
    }

    private String normalizeKeyword(String keyword) {
        String trimmed =
                keyword == null
                        ? ""
                        : keyword.trim();

        if (trimmed.isBlank()) {
            return "병원";
        }

        if (
                trimmed.contains("병원")
                        || trimmed.contains("의원")
                        || trimmed.contains("클리닉")
        ) {
            return trimmed;
        }

        return trimmed + " 병원";
    }

    private HospitalResponse toHospital(
            NaverLocalSearchResponse.Item item,
            Double currentLatitude,
            Double currentLongitude
    ) {
        Double longitude =
                parseCoordinate(item.mapx(), 180);

        Double latitude =
                parseCoordinate(item.mapy(), 90);

        Double distanceKm =
                calculateDistance(
                        currentLatitude,
                        currentLongitude,
                        latitude,
                        longitude
                );

        return new HospitalResponse(
                stripHtml(item.title()),
                item.category(),
                item.address(),
                item.roadAddress(),
                item.telephone(),
                latitude,
                longitude,
                distanceKm,
                blankToNull(item.link())
        );
    }

    private Double parseCoordinate(
            String rawValue,
            double maximum
    ) {
        if (rawValue == null || rawValue.isBlank()) {
            return null;
        }

        try {
            double value =
                    Double.parseDouble(rawValue);

            /*
             * 네이버 지역검색 좌표가 소수점 없는 정수 형태로
             * 전달되는 경우를 WGS84 좌표로 변환합니다.
             */
            if (Math.abs(value) > maximum) {
                value /= 10_000_000d;
            }

            return Math.abs(value) <= maximum
                    ? value
                    : null;

        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private Double calculateDistance(
            Double fromLatitude,
            Double fromLongitude,
            Double toLatitude,
            Double toLongitude
    ) {
        if (
                fromLatitude == null
                        || fromLongitude == null
                        || toLatitude == null
                        || toLongitude == null
        ) {
            return null;
        }

        double latitudeDistance =
                Math.toRadians(
                        toLatitude - fromLatitude
                );

        double longitudeDistance =
                Math.toRadians(
                        toLongitude - fromLongitude
                );

        double startLatitude =
                Math.toRadians(fromLatitude);

        double endLatitude =
                Math.toRadians(toLatitude);

        double haversine =
                Math.sin(latitudeDistance / 2)
                        * Math.sin(latitudeDistance / 2)
                        + Math.cos(startLatitude)
                        * Math.cos(endLatitude)
                        * Math.sin(longitudeDistance / 2)
                        * Math.sin(longitudeDistance / 2);

        double distance =
                2
                        * EARTH_RADIUS_KM
                        * Math.asin(
                        Math.sqrt(haversine)
                );

        return BigDecimal
                .valueOf(distance)
                .setScale(
                        1,
                        RoundingMode.HALF_UP
                )
                .doubleValue();
    }

    private String stripHtml(String value) {
        return Optional
                .ofNullable(value)
                .map(HTML_TAG_PATTERN::matcher)
                .map(matcher ->
                        matcher.replaceAll("")
                )
                .orElse("");
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank()
                ? null
                : value;
    }
}