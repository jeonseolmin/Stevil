package com.my.stevil_back.diet.service;

import com.my.stevil_back.diet.entity.DietRecord;
import com.my.stevil_back.diet.repository.DietRecordRepository;
import com.my.stevil_back.planner.dto.Event;
import com.my.stevil_back.planner.dto.FoodEvidence;
import com.my.stevil_back.planner.event.PlannerSavedEvent;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/*
 * Planner 식사/간식 "완료" 체크 -> 실제 섭취 기록(DietRecord) 동기화.
 *
 *  - Planner 저장 트랜잭션 안에서 동기 실행한다(@EventListener). 실패하면 Planner 저장도 롤백되어
 *    "완료인데 섭취량엔 없음" 상태가 남지 않는다. (리마인더 동기화는 별도로 AFTER_COMMIT)
 *  - plannerEventKey 가 있는 기록만 다룬다. 직접 입력한 기록은 절대 수정/삭제하지 않는다.
 *  - 그 주의 자동 기록을 저장된 계획에 맞춘다: 완료+영양정보 유효 -> 생성/갱신, 그 외(해제·삭제·운동 등) -> 삭제.
 *  - 영양정보가 없거나 검증에 실패하면 기록을 만들지 않는다(완료 상태는 그대로). 검증 규칙은 프론트 dayNutrition 과 같다.
 *  - mealType 은 시각으로 추론하지 않는다: SNACK=간식, MEAL=기타.
 */
@Component
@RequiredArgsConstructor
public class PlannerDietSyncListener {

    private final DietRecordRepository records;
    private final UserRepository users;

    @EventListener
    public void onPlannerSaved(PlannerSavedEvent saved) {
        Map<String, DietRecord> existing = records
                .findByUserIdAndPlannerEventKeyIsNotNullAndRecordDateBetween(
                        saved.userId(), saved.weekStart(), saved.weekStart().plusDays(6))
                .stream()
                .collect(Collectors.toMap(DietRecord::getPlannerEventKey, Function.identity()));

        for (Event event : saved.events()) {
            double[] n = intake(event);
            if (n == null) continue;
            DietRecord record = existing.remove(event.id());
            if (record == null) {
                record = DietRecord.builder()
                        .user(users.getReferenceById(saved.userId()))
                        .plannerEventKey(event.id())
                        .build();
            }
            record.setRecordDate(event.start().toLocalDate());
            record.setRecordTime(event.start().toLocalTime());
            record.setMealType("SNACK".equals(event.kind()) ? "간식" : "기타");
            record.setFoodName(event.title());
            record.setCalories((int) Math.round(n[0]));
            record.setCarbs(n[1]);
            record.setProtein(n[2]);
            record.setFat(n[3]);
            records.save(record);
        }
        records.deleteAll(existing.values());
    }

    /* 완료된 MEAL/SNACK 의 1인분 {kcal, 탄, 단, 지}. 기록 대상이 아니면 null. */
    static double[] intake(Event event) {
        if (!event.completed() || !List.of("MEAL", "SNACK").contains(event.kind())) return null;
        FoodEvidence evidence = event.foodEvidence();
        if (evidence == null || evidence.nutrition() == null) return null;
        double serving = number(evidence.servingWeight());
        double[] n = new double[4];
        String[] keys = {"INFO_ENG", "INFO_CAR", "INFO_PRO", "INFO_FAT"};
        for (int i = 0; i < 4; i++) {
            n[i] = number(evidence.nutrition().get(keys[i]));
            if (Double.isNaN(n[i])) return null;
        }
        if (!(serving > 0) || n[0] <= 0 || n[1] + n[2] + n[3] > serving
                || Math.abs(n[1] * 4 + n[2] * 4 + n[3] * 9 - n[0]) > Math.max(30, n[0] * .3)) return null;
        return n;
    }

    private static double number(String value) {
        return value != null && value.trim().matches("\\d+(?:\\.\\d+)?") ? Double.parseDouble(value.trim()) : Double.NaN;
    }
}
