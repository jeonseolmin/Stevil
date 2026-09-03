package com.my.stevil_back.planner;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static com.my.stevil_back.planner.PlannerTypes.*;

class PlannerMealTest {
    private static final String SOURCE="https://www.data.go.kr/data/15127578/openapi.do";
    private Map<String,String> nutrients(String energy,String protein) {
        return Map.of("INFO_ENG",energy,"INFO_PRO",protein,"INFO_CAR","10","INFO_FAT","1","INFO_NA","");
    }
    private FoodEvidence meal() {
        var parts=List.of("staple","protein","vegetable").stream().map(role -> new FoodComponent(role,role,role,SOURCE,
            "2026-09-03T00:00:00Z","100","100",nutrients("100","10"),"a".repeat(64),nutrients("100","10"))).toList();
        return new FoodEvidence("meal:sample",SOURCE,"2026-09-03T00:00:00Z","구성 음식","300",
            Map.of("INFO_ENG","300","INFO_PRO","30","INFO_CAR","30","INFO_FAT","3","INFO_NA",""),"b".repeat(64),parts);
    }
    @Test void componentsSurviveJsonPersistence() {
        var mapper=new ObjectMapper();
        var food=meal();
        var restored=mapper.readValue(mapper.writeValueAsString(food),FoodEvidence.class);
        assertEquals(food,restored);
        assertDoesNotThrow(() -> PlannerValidation.food(restored));
    }
    @Test void wrongTotalsAndMissingComponentsRejected() {
        var food=meal();
        var changed=new FoodEvidence(food.recipeId(),SOURCE,food.retrievedAt(),food.ingredients(),"300",
            nutrients("1","1"),food.fingerprint(),food.components());
        assertThrows(IllegalArgumentException.class,() -> PlannerValidation.food(changed));
        assertThrows(IllegalArgumentException.class,() -> PlannerValidation.food(new FoodEvidence(
            food.recipeId(),SOURCE,food.retrievedAt(),food.ingredients(),"300",food.nutrition(),food.fingerprint())));
    }
    @Test void legacyRecipeWithoutComponentsStillLoads() {
        var mapper=new ObjectMapper();
        var food=mapper.readValue("""
            {"recipeId":"1","sourceUrl":"https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_no=661&svc_no=COOKRCP01",
            "retrievedAt":"2026-09-03","ingredients":"쌀","servingWeight":"","nutrition":{},"fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
            """,FoodEvidence.class);
        assertTrue(food.components().isEmpty());
        assertDoesNotThrow(() -> PlannerValidation.food(food));
    }
}
