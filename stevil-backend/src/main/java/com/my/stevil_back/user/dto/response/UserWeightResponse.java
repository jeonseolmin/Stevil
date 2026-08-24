package com.my.stevil_back.user.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class UserWeightResponse {
    private Long id;
    private BigDecimal weight;
    private BigDecimal targetWeight;
    private String unit;
    private LocalDateTime recordedAt;
}
