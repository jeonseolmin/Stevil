package com.my.stevil_back.planner;
import java.time.DayOfWeek;
import java.util.*;
import static com.my.stevil_back.planner.PlannerTypes.*;

public final class PlannerValidation {
    private PlannerValidation() {}
    public static void preferences(Preferences p) {
        if(p.nutritionGoal()!=null) {
            var goal=p.nutritionGoal();
            if(!goal.confirmed()) fail("영양 목표와 적용 대상 확인이 필요합니다.");
            if(!Double.isFinite(goal.weightKg()) || !Double.isFinite(goal.proteinPerKg()) || goal.weightKg()*goal.proteinPerKg()*4>goal.calories()*.35)
                fail("단백질 목표를 확인해 주세요. 목표 열량의 35%를 넘을 수 없습니다.");
        }
        if(p.weekStart().getDayOfWeek()!=DayOfWeek.MONDAY) fail("시작일은 월요일로 선택해 주세요.");
        if(!p.wakeTime().isBefore(p.sleepTime())) fail("기상·취침은 같은 날 기준으로 입력해 주세요.");
        for(var busy:p.busySlots()) if(!busy.start().isBefore(busy.end())) fail("고정 일정의 종료 시간이 시작 시간보다 늦어야 합니다.");
        var days=new HashSet<Integer>();
        for(var window:p.exerciseWindows()) {
            if(!days.add(window.day())) fail("운동 가능 시간은 요일마다 하나씩 입력해 주세요.");
            if(!window.start().isBefore(window.end()) || window.start().isBefore(p.wakeTime()) || window.end().isAfter(p.sleepTime()))
                fail("운동 가능 시간을 기상·취침 시간 안으로 입력해 주세요.");
            if(p.exerciseDays().contains(window.day()) && (java.time.Duration.between(window.start(),window.end()).toMinutes()<10 || java.time.Duration.between(window.start(),window.end()).toMinutes()>90))
                fail("운동 시작·종료 간격은 10~90분으로 설정해 주세요.");
        }
    }
    public static void events(Preferences p,List<Event> events) {
        preferences(p);
        var ids=new HashSet<String>();
        var ordered=events.stream().sorted(Comparator.comparing(Event::start)).toList();
        Event previous=null;
        for(var e:ordered) {
            if(e.foodEvidence()!=null) food(e.foodEvidence());
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
    static void food(FoodEvidence evidence) {
        boolean composed="https://www.data.go.kr/data/15127578/openapi.do".equals(evidence.sourceUrl());
        if(!composed) {
            if(!evidence.components().isEmpty()) fail("레시피와 음식 조합의 출처를 구분해 주세요.");
            return;
        }
        if(evidence.components().size()!=3) fail("음식 조합에는 밥·반찬·채소가 필요합니다.");
        var roles=new HashSet<String>();
        var ids=new HashSet<String>();
        double weight=0;
        var totals=new HashMap<String,Double>();
        var missing=new HashSet<String>();
        var fields=List.of("INFO_ENG","INFO_CAR","INFO_PRO","INFO_FAT","INFO_NA");
        for(var component:evidence.components()) {
            if(!roles.add(component.role()) || !ids.add(component.foodId())) fail("중복된 구성 음식입니다.");
            double basis=nutrient(component.basisWeight()), amount=nutrient(component.servingWeight());
            if(basis<=0 || amount<=0) fail("영양정보 기준량과 제안량이 필요합니다.");
            weight+=amount;
            for(String key:fields) {
                String raw=component.nutrition().get(key), scaled=component.amountNutrition().get(key);
                if("INFO_NA".equals(key) && (raw==null || raw.isBlank())) {
                    missing.add(key);
                    if(scaled!=null && !scaled.isBlank()) fail("누락된 영양정보는 계산할 수 없습니다.");
                    continue;
                }
                double expected=nutrient(raw)*amount/basis;
                if(Math.abs(nutrient(scaled)-expected)>.001) fail("음식 제안량의 영양 계산을 확인해 주세요.");
                totals.merge(key,expected,Double::sum);
            }
        }
        if(!roles.equals(Set.of("staple","protein","vegetable"))) fail("음식 구성 분류를 확인해 주세요.");
        if(Math.abs(nutrient(evidence.servingWeight())-weight)>.01) fail("식사량 합계가 다릅니다.");
        for(String key:fields) {
            String total=evidence.nutrition().get(key);
            if(missing.contains(key)) {
                if(total!=null && !total.isBlank()) fail("일부 누락된 영양정보는 전체 합계로 표시할 수 없습니다.");
            } else if(Math.abs(nutrient(total)-totals.getOrDefault(key,0d))>.02) fail("식사 영양 합계가 다릅니다.");
        }
    }
    private static double nutrient(String value) {
        if(value==null || !value.matches("[0-9]+(?:\\.[0-9]+)?")) fail("영양정보의 숫자 형식을 확인해 주세요.");
        double number=Double.parseDouble(value);
        if(!Double.isFinite(number)) fail("영양정보의 숫자 범위를 확인해 주세요.");
        return number;
    }
    private static void fail(String message) { throw new IllegalArgumentException(message); }
}
