package com.my.stevil_back.admin.controller;

import com.my.stevil_back.admin.service.AdminInquiryService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.support.dto.response.AdminInquiryResponse;
import com.my.stevil_back.support.dto.requset.InquiryAnswerRequest;
import com.my.stevil_back.support.entity.enumType.InquiryCategory;
import com.my.stevil_back.support.entity.enumType.InquiryStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/inquiries")
@RequiredArgsConstructor
public class AdminInquiryController {

    private final AdminInquiryService adminInquiryService;

    @GetMapping
    public ResponseEntity<Page<AdminInquiryResponse>> getInquiries(
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(required = false) InquiryCategory category,
            @RequestParam(required = false) String keyword,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = DESC
            )
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                adminInquiryService.getInquiries(
                        status,
                        category,
                        keyword,
                        pageable
                )
        );
    }

    @GetMapping("/{inquiryId}")
    public ResponseEntity<AdminInquiryResponse> getInquiry(
            @PathVariable Long inquiryId
    ) {
        return ResponseEntity.ok(
                adminInquiryService.getInquiry(inquiryId)
        );
    }

    @PatchMapping("/{inquiryId}/processing")
    public ResponseEntity<AdminInquiryResponse> startProcessing(
            @PathVariable Long inquiryId
    ) {
        return ResponseEntity.ok(
                adminInquiryService.startProcessing(inquiryId)
        );
    }

    @PatchMapping("/{inquiryId}/answer")
    public ResponseEntity<AdminInquiryResponse> answer(
            @AuthenticationPrincipal CustomUserDetails admin,
            @PathVariable Long inquiryId,
            @Valid @RequestBody InquiryAnswerRequest request
    ) {
        return ResponseEntity.ok(
                adminInquiryService.answer(
                        admin.getUserId(),
                        inquiryId,
                        request.answer()
                )
        );
    }

    @PatchMapping("/{inquiryId}/close")
    public ResponseEntity<AdminInquiryResponse> close(
            @PathVariable Long inquiryId
    ) {
        return ResponseEntity.ok(
                adminInquiryService.close(inquiryId)
        );
    }
}