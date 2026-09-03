export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
export function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(value, days) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); return dateKey(date); }
export function monday() { const date = new Date(); date.setDate(date.getDate() - (date.getDay() + 6) % 7); return dateKey(date); }
export const defaults = (weekStart) => ({ weekStart, wakeTime: "07:00", sleepTime: "23:00", breakfastTime: "08:00", lunchTime: "12:30", dinnerTime: "18:30", exerciseTime: "19:30", exerciseMinutes: 30, exerciseDays: [0, 2, 4], intensity: "가볍게", experience: "초보", preferences: "", allergies: "", limitations: "", busySlots: [], exerciseWindows: [0, 2, 4].map(day => ({day, start:"19:30", end:"20:00"})), nutritionGoal: null, aiConsent: false });
const mins = value => { const [h, m, seconds = "0"] = value.split(":"); return Number(h) * 60 + Number(m) + Number(seconds) / 60; };
const clock = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function validatePlan(preferences, events) {
    const goal = preferences.nutritionGoal;
    if (goal && (!goal.confirmed || !Number.isFinite(goal.weightKg) || goal.weightKg < 20 || goal.weightKg > 350 || !Number.isFinite(goal.proteinPerKg) || goal.proteinPerKg < .1 || goal.proteinPerKg > 3 || !Number.isInteger(goal.calories) || goal.calories < 1000 || goal.calories > 5000 || goal.weightKg * goal.proteinPerKg * 4 > goal.calories * .35)) return "체중·목표량·적용 대상 확인을 완료해 주세요. 단백질 목표는 열량의 35% 이하여야 합니다.";
    if (mins(preferences.wakeTime) >= mins(preferences.sleepTime)) return "기상·취침은 같은 날 기준으로 입력해 주세요.";
    if (preferences.busySlots.some(slot => mins(slot.start) >= mins(slot.end) || !slot.title.trim())) return "고정 일정의 제목과 시작·종료 시간을 확인해 주세요.";
    const windows = preferences.exerciseWindows || [];
    if (new Set(windows.map(w => w.day)).size !== windows.length) return "운동 가능 시간은 요일마다 하나씩 입력해 주세요.";
    for (const window of windows) {
        if (!window.start || !window.end || mins(window.start) >= mins(window.end) || mins(window.start) < mins(preferences.wakeTime) || mins(window.end) > mins(preferences.sleepTime)) return "운동 가능 시간을 기상·취침 시간 안으로 입력해 주세요.";
        if (preferences.exerciseDays.includes(window.day) && (mins(window.end) - mins(window.start) < 10 || mins(window.end) - mins(window.start) > 90)) return "운동 시작·종료 간격은 10~90분으로 설정해 주세요.";
    }
    const ordered = [...events].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < ordered.length; i++) {
        const event = ordered[i], date = event.start.slice(0, 10), start = event.start.slice(11), end = event.end.slice(11);
        if (!event.title.trim() || mins(start) >= mins(end) || date !== event.end.slice(0, 10) || date < preferences.weekStart || date > shiftDate(preferences.weekStart, 6)) return "일정의 제목·날짜·시작·종료 시간을 확인해 주세요.";
        if (mins(start) < mins(preferences.wakeTime) || mins(end) > mins(preferences.sleepTime)) return "기상·취침 시간 안으로 일정을 옮겨 주세요.";
        if (i && date === ordered[i - 1].end.slice(0, 10) && mins(start) < mins(ordered[i - 1].end.slice(11))) return "식사·운동 일정이 서로 겹칩니다. 시간을 조정해 주세요.";
        const day = DAYS.findIndex((_, index) => shiftDate(preferences.weekStart, index) === date);
        if (event.kind === "EXERCISE") {
            const window = windows.find(w => w.day === day);
            if (!preferences.exerciseDays.includes(day) || (window && (mins(start) < mins(window.start) || mins(end) > mins(window.end)))) return "운동 일정을 선택한 요일과 가능 시간 안으로 옮겨 주세요.";
        }
        if (preferences.busySlots.some(slot => slot.day === day && mins(start) < mins(slot.end) && mins(end) > mins(slot.start))) return "고정 일정과 겹치는 계획이 있습니다. 시간을 조정해 주세요.";
    }
    return "";
}
// A deterministic UI example, never presented as AI output or saved to the server.
export function exampleWeek(p) {
    const events = [], notices = [];
    DAYS.forEach((_, day) => {
        const slots = p.busySlots.filter(s => s.day === day).map(s => [mins(s.start), mins(s.end)]);
        const tasks = [["MEAL", "아침 식사", p.breakfastTime, 30, 360, 660], ["MEAL", "점심 식사", p.lunchTime, 30, 660, 960], ["MEAL", "저녁 식사", p.dinnerTime, 30, 960, 1380]];
        const window = (p.exerciseWindows || []).find(w => w.day === day);
        if (p.exerciseDays.includes(day)) tasks.push(["EXERCISE", "가벼운 활동 시간", p.exerciseTime, window ? mins(window.end) - mins(window.start) : p.exerciseMinutes, mins(window?.start || p.wakeTime), mins(window?.end || p.sleepTime)]);
        for (const [kind, title, preferred, duration, low, high] of tasks) {
            const candidates = [];
            for (let t = Math.max(mins(p.wakeTime), low); t + duration <= Math.min(mins(p.sleepTime), high); t += 5) candidates.push(t);
            const start = candidates.sort((a, b) => Math.abs(a - mins(preferred)) - Math.abs(b - mins(preferred))).find(t => slots.every(([a, b]) => t + duration <= a || t >= b));
            if (start === undefined) { notices.push(`${DAYS[day]}요일 ${title}: 여유 시간이 없어 제외했어요.`); continue; }
            slots.push([start, start + duration]);
            const date = shiftDate(p.weekStart, day);
            events.push({ id: crypto.randomUUID(), kind, title, details: "디자인 예시입니다. 실제 AI 생성에서는 입력한 선호와 제한 사항을 참고한 내용이 표시돼요.", start: `${date}T${clock(start)}`, end: `${date}T${clock(start + duration)}`, intensity: kind === "EXERCISE" ? p.intensity : "", completed: false });
        }
    });
    return { events, notices, mode: "design_preview" };
}

export function mealCalories(events) {
    const meals = events.filter(e => e.kind === "MEAL");
    const values = meals.map(e => e.foodEvidence?.nutrition?.INFO_ENG).filter(value => typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value.trim())).map(Number).filter(Number.isFinite);
    return { total: values.length ? Math.round(values.reduce((sum, n) => sum + n, 0)) : null, partial: values.length < meals.length, count: meals.length };
}

export function dayNutrition(events) {
    const meals = events.filter(e => e.kind === "MEAL");
    const totals = { calories: 0, carbs: 0, protein: 0, fat: 0 };
    let available = 0;
    for (const meal of meals) {
        const evidence = meal.foodEvidence;
        const raw = ["INFO_ENG", "INFO_CAR", "INFO_PRO", "INFO_FAT"].map(k => evidence?.nutrition?.[k]);
        if (!Number.isFinite(Number(evidence?.servingWeight)) || Number(evidence?.servingWeight) <= 0 || raw.some(v => typeof v !== "string" || !/^\d+(?:\.\d+)?$/.test(v.trim()))) continue;
        const [calories, carbs, protein, fat] = raw.map(Number);
        if (calories <= 0 || carbs + protein + fat > Number(evidence.servingWeight) || Math.abs(carbs * 4 + protein * 4 + fat * 9 - calories) > Math.max(30, calories * .3)) continue;
        available++;
        totals.calories += calories; totals.carbs += carbs; totals.protein += protein; totals.fat += fat;
    }
    const energy = totals.carbs * 4 + totals.protein * 4 + totals.fat * 9;
    return { ...totals, available, count: meals.length, partial: available < meals.length, ratios: energy > 0 ? [totals.carbs * 4, totals.protein * 4, totals.fat * 9].map(n => Math.round(n / energy * 1000) / 10) : null };
}

// Mifflin–St Jeor resting estimate × user-selected activity multiplier.
// Maintenance estimate, not a weight-loss prescription. No guessed demographics.
export function estimateCalories(weightKg, profile, activity = 1.4) {
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 350 || !profile || !Number.isFinite(profile.heightCm) || profile.heightCm < 120 || profile.heightCm > 230 || !Number.isInteger(profile.age) || profile.age < 19 || profile.age > 78 || !["MALE", "FEMALE"].includes(profile.sex) || ![1.4, 1.6, 1.8].includes(activity)) return null;
    const resting = 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === "MALE" ? 5 : -161);
    const estimate = Math.round(resting * activity / 10) * 10;
    return estimate >= 1000 && estimate <= 5000 ? estimate : null;
}

export function defaultExerciseWindow(p, day) {
    const duration = 30;
    const start = Math.max(mins(p.wakeTime), Math.min(mins(p.exerciseTime), mins(p.sleepTime) - duration));
    return { day, start: clock(start), end: clock(start + duration) };
}
