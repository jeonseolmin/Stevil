package com.my.stevil_back.exercise.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDate;

@Getter
@AllArgsConstructor
public class WeeklyChartResponse {
    private LocalDate date; // 날짜 (X축)
    private Integer totalCalories; // 해당 날짜의 총 소모 칼로리 (Y축)
}