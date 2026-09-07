package com.my.stevil_back.planner;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static com.my.stevil_back.planner.PlannerTypes.*;

class PlannerMealTest {
    @Test void publishedSnacksHaveValidEvidenceAndPersistAsSnackEvents() throws Exception {
        var mapper=new ObjectMapper();
        try(var stream=getClass().getResourceAsStream("/planner/snacks.json");
            var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var items=mapper.readTree(stream);
            assertTrue(items.size()>=3 && items.size()<=6);
            var categories=new java.util.HashSet<String>();
            for(var item:items) {
                categories.add(item.get("category").asText());
                var evidence=mapper.treeToValue(item.get("foodEvidence"),FoodEvidence.class);
                assertTrue(factory.getValidator().validate(evidence).isEmpty());
                assertDoesNotThrow(()->PlannerValidation.food(evidence));
                var event=new Event("snack","SNACK",item.get("title").asText(),"",
                    java.time.LocalDateTime.of(2026,9,7,15,0),java.time.LocalDateTime.of(2026,9,7,15,10),"",false,evidence);
                assertTrue(factory.getValidator().validate(event).isEmpty());
                assertEquals(event,mapper.readValue(mapper.writeValueAsString(event),Event.class));
            }
            assertEquals(java.util.Set.of("shake","chicken","egg"),categories);
        }
    }
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
