package com.my.stevil_back.partnership.service;

import com.my.stevil_back.partnership.dto.request.PartnershipInquiryCreateRequest;
import com.my.stevil_back.partnership.dto.response.PartnershipInquiryResponse;
import com.my.stevil_back.partnership.entity.PartnershipInquiry;
import com.my.stevil_back.partnership.entity.enumType.PartnershipInquiryStatus;
import com.my.stevil_back.partnership.repository.PartnershipInquiryRepository;
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
public class PartnershipInquiryService {

    private final PartnershipInquiryRepository
            partnershipInquiryRepository;

    @Transactional
    public PartnershipInquiryResponse create(
            PartnershipInquiryCreateRequest request
    ) {
        PartnershipInquiry inquiry =
                PartnershipInquiry.builder()
                        .facilityType(request.facilityType())
                        .facilityName(request.facilityName().trim())
                        .managerName(request.managerName().trim())
                        .phone(request.phone().trim())
                        .email(request.email().trim())
                        .address(request.address().trim())
                        .message(normalize(request.message()))
                        .build();

        return PartnershipInquiryResponse.from(
                partnershipInquiryRepository.save(inquiry)
        );
    }

    public Page<PartnershipInquiryResponse> getAll(
            PartnershipInquiryStatus status,
            String keyword,
            Pageable pageable
    ) {
        String normalizedKeyword = normalize(keyword);

        Page<PartnershipInquiry> result;

        if (status != null && normalizedKeyword != null) {
            result =
                    partnershipInquiryRepository
                            .findByStatusAndFacilityNameContainingIgnoreCase(
                                    status,
                                    normalizedKeyword,
                                    pageable
                            );
        } else if (status != null) {
            result =
                    partnershipInquiryRepository
                            .findByStatus(
                                    status,
                                    pageable
                            );
        } else if (normalizedKeyword != null) {
            result =
                    partnershipInquiryRepository
                            .findByFacilityNameContainingIgnoreCase(
                                    normalizedKeyword,
                                    pageable
                            );
        } else {
            result =
                    partnershipInquiryRepository.findAll(pageable);
        }

        return result.map(
                PartnershipInquiryResponse::from
        );
    }

    public PartnershipInquiryResponse getOne(
            Long inquiryId
    ) {
        return PartnershipInquiryResponse.from(
                findInquiry(inquiryId)
        );
    }

    @Transactional
    public PartnershipInquiryResponse changeStatus(
            Long inquiryId,
            PartnershipInquiryStatus status,
            String rejectionReason
    ) {
        PartnershipInquiry inquiry =
                findInquiry(inquiryId);

        if (
                status == PartnershipInquiryStatus.REJECTED
                        && (
                        rejectionReason == null
                                || rejectionReason.isBlank()
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "거절 사유를 입력해 주세요."
            );
        }

        inquiry.changeStatus(
                status,
                normalize(rejectionReason)
        );

        return PartnershipInquiryResponse.from(inquiry);
    }

    private PartnershipInquiry findInquiry(
            Long inquiryId
    ) {
        return partnershipInquiryRepository
                .findById(inquiryId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "제휴 문의를 찾을 수 없습니다."
                                )
                );
    }

    private String normalize(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return null;
        }

        return value.trim();
    }
}