package com.my.stevil_back.weight.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class WeightRequest {
    private Double weight;
    private Double targetWeight;
    private LocalDateTime recordedAt;
}