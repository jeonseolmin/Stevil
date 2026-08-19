package com.my.stevil_back.admin.service;

import com.my.stevil_back.hospital.dto.response.AdminFacilityResponse;
import com.my.stevil_back.hospital.dto.request.MedicalFacilityCreateRequest;
import com.my.stevil_back.hospital.entity.enumType.FacilityApprovalStatus;
import com.my.stevil_back.hospital.entity.enumType.FacilityType;
import com.my.stevil_back.hospital.entity.MedicalFacility;
import com.my.stevil_back.hospital.repository.MedicalFacilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminFacilityService {

    private final MedicalFacilityRepository facilityRepository;

    public Page<AdminFacilityResponse> getFacilities(
            FacilityType type,
            FacilityApprovalStatus status,
            String keyword,
            Pageable pageable
    ) {
        String normalizedKeyword = normalizeKeyword(keyword);

        return facilityRepository
                .searchForAdmin(
                        type,
                        status,
                        normalizedKeyword,
                        pageable
                )
                .map(AdminFacilityResponse::from);
    }

    public AdminFacilityResponse getFacility(Long facilityId) {
        return AdminFacilityResponse.from(
                findFacility(facilityId)
        );
    }

    @Transactional
    public AdminFacilityResponse createFacility(
            MedicalFacilityCreateRequest request
    ) {
        MedicalFacility facility = new MedicalFacility(
                request.facilityType(),
                request.name().trim(),
                request.roadAddress().trim(),
                trimToNull(request.jibunAddress()),
                trimToNull(request.telephone()),
                request.latitude(),
                request.longitude(),
                trimToNull(request.businessNumber())
        );

        MedicalFacility savedFacility =
                facilityRepository.save(facility);

        return AdminFacilityResponse.from(savedFacility);
    }

    @Transactional
    public AdminFacilityResponse approveFacility(
            Long adminId,
            Long facilityId
    ) {
        MedicalFacility facility = findFacility(facilityId);

        if (facility.getApprovalStatus()
                == FacilityApprovalStatus.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 승인된 시설입니다."
            );
        }

        facility.approve(adminId);

        return AdminFacilityResponse.from(facility);
    }

    @Transactional
    public AdminFacilityResponse rejectFacility(
            Long adminId,
            Long facilityId,
            String reason
    ) {
        MedicalFacility facility = findFacility(facilityId);

        if (facility.getApprovalStatus()
                == FacilityApprovalStatus.REJECTED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 거절된 시설입니다."
            );
        }

        facility.reject(adminId, reason.trim());

        return AdminFacilityResponse.from(facility);
    }

    private MedicalFacility findFacility(Long facilityId) {
        return facilityRepository.findById(facilityId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "병원 또는 약국을 찾을 수 없습니다."
                ));
    }

    private String normalizeKeyword(String keyword) {
        return trimToNull(keyword);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}