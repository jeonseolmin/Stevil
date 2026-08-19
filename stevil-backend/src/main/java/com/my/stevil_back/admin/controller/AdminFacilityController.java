package com.my.stevil_back.admin.controller;

import com.my.stevil_back.admin.service.AdminFacilityService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.hospital.dto.response.AdminFacilityResponse;
import com.my.stevil_back.hospital.dto.request.FacilityRejectRequest;
import com.my.stevil_back.hospital.dto.request.MedicalFacilityCreateRequest;
import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/facilities")
@RequiredArgsConstructor
public class AdminFacilityController {

    private final AdminFacilityService adminFacilityService;

    @GetMapping
    public ResponseEntity<Page<AdminFacilityResponse>> getFacilities(
            @RequestParam(required = false) FacilityType type,
            @RequestParam(required = false)
            FacilityApprovalStatus status,
            @RequestParam(required = false) String keyword,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = DESC
            )
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                adminFacilityService.getFacilities(
                        type,
                        status,
                        keyword,
                        pageable
                )
        );
    }

    @GetMapping("/{facilityId}")
    public ResponseEntity<AdminFacilityResponse> getFacility(
            @PathVariable Long facilityId
    ) {
        return ResponseEntity.ok(
                adminFacilityService.getFacility(facilityId)
        );
    }

    @PostMapping
    public ResponseEntity<AdminFacilityResponse> createFacility(
            @Valid @RequestBody
            MedicalFacilityCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        adminFacilityService.createFacility(request)
                );
    }

    @PatchMapping("/{facilityId}/approve")
    public ResponseEntity<AdminFacilityResponse> approveFacility(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long facilityId
    ) {
        return ResponseEntity.ok(
                adminFacilityService.approveFacility(
                        admin.getUserId(),
                        facilityId
                )
        );
    }

    @PatchMapping("/{facilityId}/reject")
    public ResponseEntity<AdminFacilityResponse> rejectFacility(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long facilityId,
            @Valid @RequestBody FacilityRejectRequest request
    ) {
        return ResponseEntity.ok(
                adminFacilityService.rejectFacility(
                        admin.getUserId(),
                        facilityId,
                        request.reason()
                )
        );
    }
}