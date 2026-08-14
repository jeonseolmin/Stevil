package com.my.stevil_back.admin.service;

import com.my.stevil_back.support.dto.response.AdminInquiryResponse;
import com.my.stevil_back.support.entity.Inquiry;
import com.my.stevil_back.support.entity.enumType.InquiryCategory;
import com.my.stevil_back.support.entity.enumType.InquiryStatus;
import com.my.stevil_back.support.repository.InquiryRepository;
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
public class AdminInquiryService {

    private final InquiryRepository inquiryRepository;

    public Page<AdminInquiryResponse> getInquiries(
            InquiryStatus status,
            InquiryCategory category,
            String keyword,
            Pageable pageable
    ) {
        return inquiryRepository.searchForAdmin(
                status,
                category,
                normalizeKeyword(keyword),
                pageable
        ).map(AdminInquiryResponse::from);
    }

    public AdminInquiryResponse getInquiry(Long inquiryId) {
        return AdminInquiryResponse.from(
                findInquiry(inquiryId)
        );
    }

    @Transactional
    public AdminInquiryResponse startProcessing(Long inquiryId) {
        Inquiry inquiry = findInquiry(inquiryId);

        if (inquiry.getStatus() != InquiryStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "답변 대기 상태의 문의만 처리할 수 있습니다."
            );
        }

        inquiry.startProcessing();

        return AdminInquiryResponse.from(inquiry);
    }

    @Transactional
    public AdminInquiryResponse answer(
            Long adminId,
            Long inquiryId,
            String answer
    ) {
        Inquiry inquiry = findInquiry(inquiryId);

        if (inquiry.getStatus() == InquiryStatus.CLOSED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "종료된 문의에는 답변할 수 없습니다."
            );
        }

        inquiry.answer(adminId, answer.trim());

        return AdminInquiryResponse.from(inquiry);
    }

    @Transactional
    public AdminInquiryResponse close(Long inquiryId) {
        Inquiry inquiry = findInquiry(inquiryId);

        if (inquiry.getStatus() == InquiryStatus.CLOSED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 종료된 문의입니다."
            );
        }

        inquiry.close();

        return AdminInquiryResponse.from(inquiry);
    }

    private Inquiry findInquiry(Long inquiryId) {
        return inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "문의를 찾을 수 없습니다."
                ));
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }

        return keyword.trim();
    }
}