package com.my.stevil_back.planner.event;

import com.my.stevil_back.planner.dto.Event;

import java.time.LocalDate;
import java.util.List;

/** 주간 계획 저장이 커밋된 뒤(AFTER_COMMIT) 리마인더 동기화에 쓰인다. Planner 는 리마인더를 직접 알지 못한다. */
public record PlannerSavedEvent(Long userId, LocalDate weekStart, List<Event> events) {

    public PlannerSavedEvent {
        events = events == null ? List.of() : List.copyOf(events);
    }
}
