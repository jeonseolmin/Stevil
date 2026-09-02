package com.my.stevil_back.planner;
import java.time.DayOfWeek;
import java.util.*;
import static com.my.stevil_back.planner.PlannerTypes.*;

public final class PlannerValidation {
    private PlannerValidation() {}
    public static void preferences(Preferences p) {
        if(p.weekStart().getDayOfWeek()!=DayOfWeek.MONDAY) fail("시작일은 월요일로 선택해 주세요.");
        if(!p.wakeTime().isBefore(p.sleepTime())) fail("기상·취침은 같은 날 기준으로 입력해 주세요.");
        for(var busy:p.busySlots()) if(!busy.start().isBefore(busy.end())) fail("고정 일정의 종료 시간이 시작 시간보다 늦어야 합니다.");
        var days=new HashSet<Integer>();
        for(var window:p.exerciseWindows()) {
            if(!days.add(window.day())) fail("운동 가능 시간은 요일마다 하나씩 입력해 주세요.");
            if(!window.start().isBefore(window.end()) || window.start().isBefore(p.wakeTime()) || window.end().isAfter(p.sleepTime()))
                fail("운동 가능 시간을 기상·취침 시간 안으로 입력해 주세요.");
            if(p.exerciseDays().contains(window.day()) && java.time.Duration.between(window.start(),window.end()).toMinutes()<p.exerciseMinutes())
                fail("운동 가능 시간이 1회 운동 시간보다 짧습니다.");
        }
    }
    public static void events(Preferences p,List<Event> events) {
        preferences(p);
        var ids=new HashSet<String>();
        var ordered=events.stream().sorted(Comparator.comparing(Event::start)).toList();
        Event previous=null;
        for(var e:ordered) {
            if(!ids.add(e.id())) fail("중복된 일정이 있습니다.");
            if(!e.start().isBefore(e.end()) || !e.start().toLocalDate().equals(e.end().toLocalDate()) ||
               e.start().toLocalDate().isBefore(p.weekStart()) || !e.start().toLocalDate().isBefore(p.weekStart().plusDays(7))) fail("일정은 선택한 주 안에 있어야 합니다.");
            if(e.start().toLocalTime().isBefore(p.wakeTime()) || e.end().toLocalTime().isAfter(p.sleepTime())) fail("일정이 기상·취침 시간 밖에 있습니다.");
            if(previous!=null && e.start().isBefore(previous.end())) fail("식사·운동 일정이 서로 겹칩니다.");
            int day=(int)java.time.temporal.ChronoUnit.DAYS.between(p.weekStart(),e.start().toLocalDate());
            if("EXERCISE".equals(e.kind())) {
                if(!p.exerciseDays().contains(day)) fail("선택한 운동 요일 안으로 일정을 옮겨 주세요.");
                for(var window:p.exerciseWindows()) if(window.day()==day &&
                        (e.start().toLocalTime().isBefore(window.start()) || e.end().toLocalTime().isAfter(window.end())))
                    fail("운동 가능 시간 밖에 있는 일정입니다.");
            }
            for(var busy:p.busySlots()) if(busy.day()==day && e.start().toLocalTime().isBefore(busy.end()) && e.end().toLocalTime().isAfter(busy.start())) fail("고정 일정과 겹치는 시간이 있습니다.");
            previous=e;
        }
    }
    private static void fail(String message) { throw new IllegalArgumentException(message); }
}
