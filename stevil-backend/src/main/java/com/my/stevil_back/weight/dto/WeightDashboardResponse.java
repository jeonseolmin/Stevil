package com.my.stevil_back.weight.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

@Getter
@Builder
public class WeightDashboardResponse {
    private Double currentWeight;
    private Double startWeight;
    private Double targetWeight;
    private Double lostWeight;
    private Double remainingWeight;
    private Double progressPercent;

    private List<WeightChartData> chartData;
}