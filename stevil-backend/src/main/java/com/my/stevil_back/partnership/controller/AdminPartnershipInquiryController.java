package com.my.stevil_back.partnership.controller;

import com.my.stevil_back.partnership.dto.request.PartnershipInquiryStatusRequest;
import com.my.stevil_back.partnership.dto.response.PartnershipInquiryResponse;
import com.my.stevil_back.partnership.entity.enumType.PartnershipInquiryStatus;
import com.my.stevil_back.partnership.service.PartnershipInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/partnership-inquiries")
@RequiredArgsConstructor
public class AdminPartnershipInquiryController {

    private final PartnershipInquiryService
            partnershipInquiryService;

    @GetMapping
    public ResponseEntity<Page<PartnershipInquiryResponse>>
    getAll(
            @RequestParam(required = false)
            PartnershipInquiryStatus status,

            @RequestParam(required = false)
            String keyword,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = DESC
            )
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                partnershipInquiryService.getAll(
                        status,
                        keyword,
                        pageable
                )
        );
    }

    @GetMapping("/{inquiryId}")
    public ResponseEntity<PartnershipInquiryResponse>
    getOne(
            @PathVariable Long inquiryId
    ) {
        return ResponseEntity.ok(
                partnershipInquiryService.getOne(inquiryId)
        );
    }

    @PatchMapping("/{inquiryId}/status")
    public ResponseEntity<PartnershipInquiryResponse>
    changeStatus(
            @PathVariable Long inquiryId,

            @Valid
            @RequestBody
            PartnershipInquiryStatusRequest request
    ) {
        return ResponseEntity.ok(
                partnershipInquiryService.changeStatus(
                        inquiryId,
                        request.status(),
                        request.rejectionReason()
                )
        );
    }
}