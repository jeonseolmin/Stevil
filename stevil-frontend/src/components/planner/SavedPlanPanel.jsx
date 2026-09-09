import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { loadWeek, saveWeek } from "../../api/plannerApi";
import { dateKey, shiftDate, dayNutrition } from "./plannerUtils";
import "./SavedPlanPanel.css";

export default function SavedPlanPanel({ kind }) {
    const [date, setDate] = useState(() => dateKey(new Date()));
    const week = shiftDate(date, -(new Date(`${date}T12:00:00`).getDay() + 6) % 7);
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);
    const operation = useRef(false);
    useEffect(() => {
        let active = true;
        async function fetchPlan() {
        setLoading(true); setError("");
        await loadWeek(week).then(value => { if (active) setPlan(value); })
            .catch(() => { if (active) { setPlan(null); setError("저장한 계획을 불러오지 못했어요. 다시 시도해 주세요."); } })
            .finally(() => { if (active) setLoading(false); });
        }
        fetchPlan();
        return () => { active = false; };
    }, [week, reload]);
    useEffect(() => {
        const refresh = event => {
            if (!operation.current && (!event.detail?.week || event.detail.week === week)) setReload(value => value + 1);
        };
        window.addEventListener("planner:saved", refresh);
        window.addEventListener("focus", refresh);
        return () => { window.removeEventListener("planner:saved", refresh); window.removeEventListener("focus", refresh); };
    }, [week]);
    async function complete(id, completed) {
        if (operation.current || !plan) return;
        operation.current = true; setSaving(true); setError("");
        try {
            setPlan(await saveWeek({ ...plan, events: plan.events.map(event => event.id === id ? { ...event, completed } : event) }));
        } catch (err) {
            setError(err.response?.status === 409 ? "다른 화면에서 계획이 변경됐어요. 다시 불러온 뒤 체크해 주세요." : "완료 상태를 저장하지 못했어요. 다시 시도해 주세요.");
        } finally { operation.current = false; setSaving(false); }
    }
    const food = kind === "food";
    const events = (plan?.events || []).filter(event => event.start.slice(0,10) === date && (food ? ["MEAL", "SNACK"].includes(event.kind) : event.kind === "EXERCISE")).sort((a,b) => a.start.localeCompare(b.start));
    return <section className="saved-plan-panel" aria-label={food ? "저장한 식단·간식 계획" : "저장한 운동 계획"} aria-busy={loading || saving}>
        <header><div><small>MY WEEKLY PLAN</small><h2>{food ? "오늘의 식단과 간식" : "오늘의 운동 계획"}</h2><p>대시보드에서 확정 저장한 일정이에요. 완료 체크는 바로 함께 저장됩니다.</p></div><label>계획 날짜<input type="date" required value={date} disabled={saving} onChange={event => { if (event.target.value) setDate(event.target.value); }} /></label></header>
        {error && <p role="alert">{error} <button disabled={saving || loading} onClick={() => setReload(value => value + 1)}>다시 불러오기</button></p>}
        {loading ? <p role="status">계획을 불러오는 중…</p> : events.length ? <div className="saved-plan-list">{events.map(event => {
            const nutrition = dayNutrition([event]);
            const duration = Math.round((new Date(event.end) - new Date(event.start)) / 60000);
            return <article key={event.id} className={event.completed ? "is-complete" : ""}>
                <div className="saved-plan-time"><span>{event.start.slice(11,16)}</span><small>{event.kind === "SNACK" ? "간식" : food ? "식사" : `${duration}분`}</small></div>
                <div className="saved-plan-content"><strong>{event.title}</strong>{food ? <p>{nutrition.available ? `${Math.round(nutrition.calories)} kcal · 탄 ${nutrition.carbs.toFixed(1)}g · 단 ${nutrition.protein.toFixed(1)}g · 지 ${nutrition.fat.toFixed(1)}g` : "영양정보 없음"}</p> : <p>{event.intensity} · {event.start.slice(11,16)}–{event.end.slice(11,16)}</p>}
                <details><summary>상세 보기</summary><p>{event.details || "추가 설명이 없습니다."}</p>{event.foodEvidence?.components?.map(item => <p key={item.foodId}>{item.name} · {item.servingWeight}g</p>)}</details></div>
                <label className="saved-plan-check"><input type="checkbox" checked={event.completed} disabled={saving} onChange={e => complete(event.id, e.target.checked)} aria-label={`${event.title} 계획 완료`} />완료</label>
            </article>;
        })}</div> : !error && <p className="saved-plan-empty">이 날짜에 저장한 {food ? "식단·간식" : "운동"} 계획이 없어요. 대시보드에서 계획을 확정하고 저장해 주세요.</p>}
        <footer><span>계획 완료 체크는 실제 {food ? "섭취량" : "운동량"} 기록과 별도로 관리합니다.</span><Link to="/dashboard#planner-title">대시보드에서 계획 편집 ↗</Link></footer>
    </section>;
}
