import axiosInstance from "./axiosInstance";
function normalizeEvents(events) {
    return events.map(event => ({ ...event, start: event.start.slice(0, 16), end: event.end.slice(0, 16) }));
}
function normalize(plan) {
    if (!plan) return plan;
    const preferences = { ...plan.preferences };
    for (const key of ["wakeTime", "sleepTime", "breakfastTime", "lunchTime", "dinnerTime", "exerciseTime"]) preferences[key] = preferences[key].slice(0, 5);
    preferences.exerciseWindows = (preferences.exerciseWindows || []).map(slot => ({ ...slot, start: slot.start.slice(0, 5), end: slot.end.slice(0, 5) }));
    preferences.busySlots = preferences.busySlots.map(slot => ({ ...slot, start: slot.start.slice(0, 5), end: slot.end.slice(0, 5) }));
    return { ...plan, preferences, events: normalizeEvents(plan.events) };
}
export const loadWeek = (week) => axiosInstance.get("/planner", { params: { week } }).then(r => r.status === 204 ? null : normalize(r.data));
export const generateWeek = (preferences) => axiosInstance.post("/planner/draft", preferences, { timeout: 100000 }).then(r => ({ ...r.data, events: normalizeEvents(r.data.events) }));
export const saveWeek = (plan) => axiosInstance.put("/planner", plan).then(r => normalize(r.data));

export const loadPlannerProfile = () => axiosInstance.get("/planner/profile").then(r => r.data);
