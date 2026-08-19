package com.my.stevil_back.hospital.controller;

import com.my.stevil_back.hospital.dto.response.HospitalResponse;
import com.my.stevil_back.hospital.service.HospitalSearchService;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/hospitals")
@RequiredArgsConstructor
public class HospitalController {

    private final HospitalSearchService hospitalSearchService;

    @GetMapping("/search")
    public List<HospitalResponse> searchHospitals(
            @RequestParam(defaultValue = "병원")
            @Size(max = 100)
            String query,

            @RequestParam(required = false)
            @DecimalMin("-90.0")
            @DecimalMax("90.0")
            Double latitude,

            @RequestParam(required = false)
            @DecimalMin("-180.0")
            @DecimalMax("180.0")
            Double longitude
    ) {
        return hospitalSearchService.search(
                query,
                latitude,
                longitude
        );
    }
}