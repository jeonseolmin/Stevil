package com.my.stevil_back.patientreport.dto.request;

import jakarta.validation.constraints.NotNull;

public record DoctorFeedbackRequest(@NotNull Long reportId, String content) {}
