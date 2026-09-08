package com.my.stevil_back.partnership.controller;

import com.my.stevil_back.partnership.dto.request.PartnershipInquiryCreateRequest;
import com.my.stevil_back.partnership.dto.response.PartnershipInquiryResponse;
import com.my.stevil_back.partnership.service.PartnershipInquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/partnership-inquiries")
@RequiredArgsConstructor
public class PartnershipInquiryController {

    private final PartnershipInquiryService
            partnershipInquiryService;

    @PostMapping
    public ResponseEntity<PartnershipInquiryResponse>
    create(
            @Valid
            @RequestBody
            PartnershipInquiryCreateRequest request
    ) {
        return ResponseEntity.ok(
                partnershipInquiryService.create(request)
        );
    }
}