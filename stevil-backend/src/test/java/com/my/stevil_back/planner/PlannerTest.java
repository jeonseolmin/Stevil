package com.my.stevil_back.planner;
import com.my.stevil_back.planner.validation.PlannerValidation;
import com.my.stevil_back.planner.entity.WeeklyPlan;
import com.my.stevil_back.planner.repository.WeeklyPlanRepository;
import com.my.stevil_back.planner.service.PlannerService;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.time.*;
import java.util.*;
import com.my.stevil_back.planner.dto.*;
import com.my.stevil_back.planner.dto.request.Save;
import com.my.stevil_back.planner.dto.response.Draft;
import com.my.stevil_back.planner.dto.response.Saved;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PlannerTest {
    @Test void exerciseAvailabilitySurvivesJsonAndPreventsOutOfWindowSave() {
        var mapper=new ObjectMapper();
        var original=mapper.writeValueAsString(prefs(List.of()));
        var p=mapper.readValue(original.replace("\"exerciseWindows\":[]", "\"exerciseWindows\":[{\"day\":0,\"start\":\"09:00:00\",\"end\":\"10:00:00\"}]"),Preferences.class);
        assertEquals(1,p.exerciseWindows().size());
        var inside=new Event("inside","EXERCISE","걷기","",LocalDateTime.of(2026,9,7,9,0),LocalDateTime.of(2026,9,7,9,30),"가볍게",false);
        assertDoesNotThrow(()-> PlannerValidation.events(p,List.of(inside)));
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
    @Test void workPermissionsPersistAndOnlyAllowSelectedKinds() {
        var mapper=new ObjectMapper();
        var slot=new BusySlot(0,LocalTime.of(9,0),LocalTime.of(17,0),"업무",true,false);
        var p=prefs(List.of(slot));
        assertEquals(p,mapper.readValue(mapper.writeValueAsString(p),Preferences.class));
        assertDoesNotThrow(()->PlannerValidation.events(p,List.of(event("lunch",12,13))));
        var snack=new Event("snack","SNACK","간식","",LocalDateTime.of(2026,9,7,15,0),LocalDateTime.of(2026,9,7,15,10),"",false);
        assertThrows(IllegalArgumentException.class,()->PlannerValidation.events(p,List.of(snack)));
        assertTrue(new BusySlot(0,LocalTime.of(9,0),LocalTime.of(17,0),"업무",true,true).allows("SNACK"));
        assertFalse(slot.allows("EXERCISE"));
        var old=mapper.readValue("{\"day\":0,\"start\":\"09:00:00\",\"end\":\"17:00:00\",\"title\":\"업무\"}",BusySlot.class);
        assertFalse(old.allowMeals());assertFalse(old.allowSnacks());
    }
    @Test void rejectsOverlappingAndFixedEvents() {
        assertThrows(IllegalArgumentException.class,()->PlannerValidation.events(prefs(List.of()),List.of(event("1",8,10),event("2",9,11))));
        assertThrows(IllegalArgumentException.class,()->PlannerValidation.events(prefs(List.of(new BusySlot(0,LocalTime.of(8,0),LocalTime.of(10,0),"업무"))),List.of(event("1",9,11))));
        assertDoesNotThrow(()->PlannerValidation.events(prefs(List.of()),List.of(event("1",8,9),event("2",9,10))));
    }
    @Test void savesOnlyUnderAuthenticatedUserAndRejectsStaleRevision() {
        var repository=mock(WeeklyPlanRepository.class);var users=mock(UserRepository.class);var json=mock(ObjectMapper.class);
        var service=new PlannerService(repository,users,json,mock(Validator.class),"http://127.0.0.1:8091/api/plan");
        var p=prefs(List.of());
        when(users.findByIdForUpdate(17L)).thenReturn(Optional.of(User.builder().id(17L).build()));
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
        var service=new PlannerService(repository,mock(UserRepository.class),mock(ObjectMapper.class),mock(Validator.class),"http://127.0.0.1:8091/api/plan");
        when(repository.findByUserIdAndWeekStart(29L,LocalDate.of(2026,9,7))).thenReturn(Optional.empty());
        assertNull(service.get(29L,LocalDate.of(2026,9,7)));
        verify(repository).findByUserIdAndWeekStart(29L,LocalDate.of(2026,9,7));
    }
}
