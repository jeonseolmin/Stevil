package com.my.stevil_back.reminder.service;

import com.my.stevil_back.planner.event.PlannerSavedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/*
 * Planner 저장이 커밋된 뒤에만 동기화한다(롤백된 저장은 동기화하지 않음).
 * 동기 실행이지만 예외를 모두 잡으므로 동기화 실패가 Planner 저장 응답을 깨지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReminderPlannerSyncListener {

    private final ReminderSyncService syncService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPlannerSaved(PlannerSavedEvent event) {
        try {
            syncService.sync(event.userId(), event.weekStart(), event.events());
        } catch (Exception e) {
            log.warn("Planner reminder sync failed (plan kept): userId={}, weekStart={}, error={}",
                    event.userId(), event.weekStart(), e.getClass().getSimpleName());
        }
    }
}
