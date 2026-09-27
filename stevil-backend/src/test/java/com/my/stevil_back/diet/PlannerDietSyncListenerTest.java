package com.my.stevil_back.diet;

import com.my.stevil_back.diet.entity.DietRecord;
import com.my.stevil_back.diet.repository.DietRecordRepository;
import com.my.stevil_back.diet.service.PlannerDietSyncListener;
import com.my.stevil_back.planner.dto.Event;
import com.my.stevil_back.planner.dto.FoodEvidence;
import com.my.stevil_back.planner.event.PlannerSavedEvent;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/* Planner 완료 체크 -> 섭취 기록: 생성·갱신·해제 삭제, 영양정보 없으면 생성 안 함, 직접 입력 기록은 대상 아님. */
class PlannerDietSyncListenerTest {

    private static final LocalDate WEEK = LocalDate.of(2026, 9, 21); // 월요일

    private final DietRecordRepository records = mock(DietRecordRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final PlannerDietSyncListener listener = new PlannerDietSyncListener(records, users);

    private static FoodEvidence evidence(String kcal, String carbs, String protein, String fat) {
        return new FoodEvidence("r1", "https://www.data.go.kr/data/15127578/openapi.do", "2026-09-21", "", "300",
                Map.of("INFO_ENG", kcal, "INFO_CAR", carbs, "INFO_PRO", protein, "INFO_FAT", fat), "0".repeat(64));
    }

    private static Event event(String id, String kind, boolean completed, FoodEvidence evidence) {
        LocalDateTime start = LocalDateTime.of(2026, 9, 23, 12, 30);
        return new Event(id, kind, "닭가슴살 샐러드", "", start, start.plusMinutes(30), "", completed, evidence);
    }

    private List<DietRecord> sync(List<DietRecord> existing, Event... events) {
        when(records.findByUserIdAndPlannerEventKeyIsNotNullAndRecordDateBetween(1L, WEEK, WEEK.plusDays(6)))
                .thenReturn(new ArrayList<>(existing));
        when(users.getReferenceById(1L)).thenReturn(mock(User.class));
        listener.onPlannerSaved(new PlannerSavedEvent(1L, WEEK, List.of(events)));
        ArgumentCaptor<DietRecord> saved = ArgumentCaptor.forClass(DietRecord.class);
        verify(records, atLeast(0)).save(saved.capture());
        return saved.getAllValues();
    }

    @Test
    void completedMealBecomesIntakeRecord() {
        List<DietRecord> saved = sync(List.of(),
                event("m1", "MEAL", true, evidence("420", "30", "42", "12")),
                event("s1", "SNACK", true, evidence("150", "10", "12", "6")));

        assertThat(saved).hasSize(2);
        DietRecord meal = saved.get(0);
        assertThat(meal.getPlannerEventKey()).isEqualTo("m1");
        assertThat(meal.getProtein()).isEqualTo(42);
        assertThat(meal.getCalories()).isEqualTo(420);
        assertThat(meal.getRecordDate()).isEqualTo(LocalDate.of(2026, 9, 23));
        assertThat(meal.getRecordTime()).isEqualTo(LocalTime.of(12, 30));
        assertThat(meal.getMealType()).isEqualTo("기타");
        assertThat(saved.get(1).getMealType()).isEqualTo("간식");
    }

    @Test
    void uncheckedOrRemovedEventDeletesOnlyItsAutoRecord() {
        DietRecord kept = DietRecord.builder().plannerEventKey("m1").protein(1).build();
        DietRecord unchecked = DietRecord.builder().plannerEventKey("m2").build();
        DietRecord removed = DietRecord.builder().plannerEventKey("gone").build();

        List<DietRecord> saved = sync(List.of(kept, unchecked, removed),
                event("m1", "MEAL", true, evidence("420", "30", "42", "12")),
                event("m2", "MEAL", false, evidence("420", "30", "42", "12")));

        assertThat(saved).containsExactly(kept); // 같은 기록을 갱신(새로 만들지 않음)
        assertThat(kept.getProtein()).isEqualTo(42);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Iterable<DietRecord>> deleted = ArgumentCaptor.forClass(Iterable.class);
        verify(records).deleteAll(deleted.capture());
        assertThat(deleted.getValue()).containsExactlyInAnyOrder(unchecked, removed);
    }

    @Test
    void missingOrImplausibleNutritionCreatesNothing() {
        List<DietRecord> saved = sync(List.of(),
                event("a", "MEAL", true, null),
                event("b", "MEAL", true, evidence("420", "30", "abc", "12")),
                event("c", "MEAL", true, evidence("100", "80", "80", "10")), // 합이 kcal 과 크게 어긋남
                event("d", "EXERCISE", true, null));

        assertThat(saved).isEmpty();
        verify(records, never()).save(any());
    }
}
