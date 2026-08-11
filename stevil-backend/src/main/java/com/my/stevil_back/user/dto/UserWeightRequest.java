package com.my.stevil_back.user.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class UserWeightRequest {
    private BigDecimal weight;
    private BigDecimal targetWeight;
    private LocalDateTime recordedAt;
}
