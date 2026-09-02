package com.my.stevil_back.planner;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import static com.my.stevil_back.planner.PlannerTypes.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PlannerTest {
    @Test void exerciseAvailabilitySurvivesJsonAndPreventsOutOfWindowSave() {
        var mapper=new ObjectMapper();
        var original=mapper.writeValueAsString(prefs(List.of()));
        var p=mapper.readValue(original.replace("\"exerciseWindows\":[]", "\"exerciseWindows\":[{\"day\":0,\"start\":\"09:00:00\",\"end\":\"10:00:00\"}]"),Preferences.class);
        assertEquals(1,p.exerciseWindows().size());
        var inside=new Event("inside","EXERCISE","걷기","",LocalDateTime.of(2026,9,7,9,0),LocalDateTime.of(2026,9,7,9,30),"가볍게",false);
        assertDoesNotThrow(()->PlannerValidation.events(p,List.of(inside)));
        var outside=new Event("outside","EXERCISE","걷기","",LocalDateTime.of(2026,9,7,19,0),LocalDateTime.of(2026,9,7,19,30),"가볍게",false);
        assertThrows(IllegalArgumentException.class,()->PlannerValidation.events(p,List.of(outside)));
        assertEquals(p,mapper.readValue(mapper.writeValueAsString(p),Preferences.class));
    }
    @Test void jsonRoundTripKeepsCalendarDatesAndTimes() {
        var mapper=new ObjectMapper();
        var original=new Saved(2,prefs(List.of()),List.of(event("roundtrip",8,9)));
        var decoded=mapper.readValue(mapper.writeValueAsString(original),Saved.class);
        assertEquals(original,decoded);
    }
    private Preferences prefs(List<BusySlot> slots) {
        return new Preferences(LocalDate.of(2026,9,7),LocalTime.of(7,0),LocalTime.of(23,0),
                LocalTime.of(8,0),LocalTime.of(12,30),LocalTime.of(18,30),LocalTime.of(19,30),30,
                List.of(0,2,4),"초보","가볍게","","","",slots,true);
    }
    private Event event(String id,int start,int end) {
        return new Event(id,"MEAL","식사","",LocalDateTime.of(2026,9,7,start,0),LocalDateTime.of(2026,9,7,end,0),"",false);
    }
    @Test void rejectsOverlappingAndFixedEvents() {
        assertThrows(IllegalArgumentException.class,()->PlannerValidation.events(prefs(List.of()),List.of(event("1",8,10),event("2",9,11))));
        assertThrows(IllegalArgumentException.class,()->PlannerValidation.events(prefs(List.of(new BusySlot(0,LocalTime.of(8,0),LocalTime.of(10,0),"업무"))),List.of(event("1",9,11))));
        assertDoesNotThrow(()->PlannerValidation.events(prefs(List.of()),List.of(event("1",8,9),event("2",9,10))));
    }
    @Test void savesOnlyUnderAuthenticatedUserAndRejectsStaleRevision() {
        var repository=mock(WeeklyPlanRepository.class);var em=mock(EntityManager.class);var json=mock(ObjectMapper.class);
        var service=new PlannerService(repository,em,json,mock(Validator.class),"http://127.0.0.1:8091/api/plan");
        var p=prefs(List.of());
        when(em.find(User.class,17L,LockModeType.PESSIMISTIC_WRITE)).thenReturn(User.builder().id(17L).build());
        when(repository.findByUserIdAndWeekStart(17L,p.weekStart())).thenReturn(Optional.empty());
        when(json.writeValueAsString(any())).thenReturn("{}");
        var saved=service.save(17L,new Save(0,p,List.of(event("1",8,9))));
        assertEquals(1,saved.revision());
        verify(repository).save(argThat(plan->plan.getUserId().equals(17L)&&plan.getWeekStart().equals(p.weekStart())));
        var existing=new WeeklyPlan(17L,p.weekStart());existing.update("{}");
        when(repository.findByUserIdAndWeekStart(17L,p.weekStart())).thenReturn(Optional.of(existing));
        var conflict=assertThrows(ResponseStatusException.class,()->service.save(17L,new Save(0,p,List.of())));
        assertEquals(409,conflict.getStatusCode().value());
    }
    @Test void readsOnlyRequestedUsersWeek() {
        var repository=mock(WeeklyPlanRepository.class);
        var service=new PlannerService(repository,mock(EntityManager.class),mock(ObjectMapper.class),mock(Validator.class),"http://127.0.0.1:8091/api/plan");
        when(repository.findByUserIdAndWeekStart(29L,LocalDate.of(2026,9,7))).thenReturn(Optional.empty());
        assertNull(service.get(29L,LocalDate.of(2026,9,7)));
        verify(repository).findByUserIdAndWeekStart(29L,LocalDate.of(2026,9,7));
    }
}
