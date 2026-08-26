package com.my.stevil_back.partnership.dto.request;

import com.my.stevil_back.partnership.entity.enumType.PartnershipInquiryStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PartnershipInquiryStatusRequest(

        @NotNull
        PartnershipInquiryStatus status,

        @Size(max = 500)
        String rejectionReason

) {
}