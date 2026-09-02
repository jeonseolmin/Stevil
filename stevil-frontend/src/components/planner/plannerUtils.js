export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
export function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDate(value, days) { const date = new Date(`${value}T12:00:00`); date.setDate(date.getDate() + days); return dateKey(date); }
export function monday() { const date = new Date(); date.setDate(date.getDate() - (date.getDay() + 6) % 7); return dateKey(date); }
export const defaults = (weekStart) => ({ weekStart, wakeTime: "07:00", sleepTime: "23:00", breakfastTime: "08:00", lunchTime: "12:30", dinnerTime: "18:30", exerciseTime: "19:30", exerciseMinutes: 30, exerciseDays: [0, 2, 4], intensity: "가볍게", experience: "초보", preferences: "", allergies: "", limitations: "", busySlots: [], exerciseWindows: [], aiConsent: false });
const mins = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
const clock = value => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function validatePlan(preferences, events) {
    if (preferences.wakeTime >= preferences.sleepTime) return "기상·취침은 같은 날 기준으로 입력해 주세요.";
    if (preferences.busySlots.some(slot => slot.start >= slot.end || !slot.title.trim())) return "고정 일정의 제목과 시작·종료 시간을 확인해 주세요.";
    const windows = preferences.exerciseWindows || [];
    if (new Set(windows.map(w => w.day)).size !== windows.length) return "운동 가능 시간은 요일마다 하나씩 입력해 주세요.";
    for (const window of windows) {
        if (!window.start || !window.end || window.start >= window.end || window.start < preferences.wakeTime || window.end > preferences.sleepTime) return "운동 가능 시간을 기상·취침 시간 안으로 입력해 주세요.";
        if (preferences.exerciseDays.includes(window.day) && mins(window.end) - mins(window.start) < preferences.exerciseMinutes) return "운동 가능 시간이 1회 운동 시간보다 짧습니다.";
    }
    const ordered = [...events].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < ordered.length; i++) {
        const event = ordered[i], date = event.start.slice(0, 10), start = event.start.slice(11), end = event.end.slice(11);
        if (!event.title.trim() || event.start >= event.end || date !== event.end.slice(0, 10) || date < preferences.weekStart || date > shiftDate(preferences.weekStart, 6)) return "일정의 제목·날짜·시작·종료 시간을 확인해 주세요.";
        if (start < preferences.wakeTime || end > preferences.sleepTime) return "기상·취침 시간 안으로 일정을 옮겨 주세요.";
        if (i && event.start < ordered[i - 1].end) return "식사·운동 일정이 서로 겹칩니다. 시간을 조정해 주세요.";
        const day = DAYS.findIndex((_, index) => shiftDate(preferences.weekStart, index) === date);
        if (event.kind === "EXERCISE") {
            const window = windows.find(w => w.day === day);
            if (!preferences.exerciseDays.includes(day) || (window && (start < window.start || end > window.end))) return "운동 일정을 선택한 요일과 가능 시간 안으로 옮겨 주세요.";
        }
        if (preferences.busySlots.some(slot => slot.day === day && start < slot.end && end > slot.start)) return "고정 일정과 겹치는 계획이 있습니다. 시간을 조정해 주세요.";
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
        if (p.exerciseDays.includes(day)) tasks.push(["EXERCISE", "가벼운 활동 시간", p.exerciseTime, p.exerciseMinutes, mins(window?.start || p.wakeTime), mins(window?.end || p.sleepTime)]);
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
