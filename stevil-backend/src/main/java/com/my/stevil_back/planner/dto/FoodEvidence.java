package com.my.stevil_back.planner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

public record FoodEvidence(@NotBlank @Size(max=80) String recipeId,
        @Pattern(regexp="https://(?:www\\.foodsafetykorea\\.go\\.kr/api/openApiInfo\\.do\\?menu_no=661&svc_no=COOKRCP01|www\\.data\\.go\\.kr/data/15127578/openapi\\.do)") @NotNull String sourceUrl,
        @NotNull @Size(max=80) String retrievedAt, @NotNull @Size(max=10000) String ingredients,
        @NotNull @Size(max=100) String servingWeight,
        @NotNull @Size(max=5) Map<@Size(max=20) String, @Size(max=100) String> nutrition,
        @NotNull @Pattern(regexp="[a-f0-9]{64}") String fingerprint,
        @Size(max=3) List<@NotNull @Valid FoodComponent> components) {
    public FoodEvidence {
        components = components == null ? List.of() : List.copyOf(components);
    }
    public FoodEvidence(String recipeId,String sourceUrl,String retrievedAt,String ingredients,String servingWeight,
            Map<String,String> nutrition,String fingerprint) {
        this(recipeId,sourceUrl,retrievedAt,ingredients,servingWeight,nutrition,fingerprint,List.of());
    }
}
