package com.my.stevil_back.medical.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class InjectionRequestDto {
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate recordDate;
    private Double dosage;
    private String injectionSite;
    private List<String> symptoms;
    private String lifestyleMemo;
}