package com.my.stevil_back.hospital.service;

import com.my.stevil_back.hospital.config.NaverSearchProperties;
import com.my.stevil_back.hospital.dto.response.HospitalResponse;
import com.my.stevil_back.hospital.dto.response.NaverLocalSearchResponse;
import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.hospital.repository.MedicalFacilityRepository;
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
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
    private final MedicalFacilityRepository medicalFacilityRepository;

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
        Set<String> partnerRoadAddresses = fetchPartnerRoadAddresses();

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
                            currentLongitude,
                            partnerRoadAddresses
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
            Double currentLongitude,
            Set<String> partnerRoadAddresses
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

        boolean isPartner = partnerRoadAddresses.contains(
                normalizeAddress(item.roadAddress())
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
                blankToNull(item.link()),
                isPartner
        );
    }

    /*
     * 승인된(APPROVED) 병원 시설의 도로명 주소를 1회 조회해
     * 정규화된 값의 Set으로 반환한다. 검색 결과 병원마다 DB를
     * 조회하는 N+1을 피하기 위한 목적이며, 검색 1회당 1쿼리만 발생한다.
     */
    private Set<String> fetchPartnerRoadAddresses() {
        return medicalFacilityRepository
                .findByFacilityTypeAndApprovalStatus(
                        FacilityType.HOSPITAL,
                        FacilityApprovalStatus.APPROVED
                )
                .stream()
                .map(facility -> normalizeAddress(
                        facility.getRoadAddress()
                ))
                .collect(Collectors.toSet());
    }

    /*
     * 네이버 검색 결과의 도로명 주소와 관리자가 직접 입력한
     * MedicalFacility.roadAddress는 서로 다른 경로로 만들어진 문자열이라
     * 공백 차이 정도만 최소한으로 보정한다. 표기 방식 자체가 다른 경우
     * (예: 지번 축약, 건물명 유무)는 이 로직으로 매칭되지 않는다 — 알려진 한계.
     */
    private String normalizeAddress(String value) {
        return value == null
                ? ""
                : value.trim().replaceAll("\\s+", "");
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