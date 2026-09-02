import { useEffect, useRef, useState } from "react";
import { loadWeek, generateWeek, saveWeek } from "../../api/plannerApi";
import { DAYS, defaults, exampleWeek, monday, shiftDate, validatePlan, mealCalories } from "./plannerUtils";
import "./WeeklyPlanner.css";

function Macros({ evidence, compact = false }) {
    const labels = [["INFO_CAR", "탄수화물", "탄"], ["INFO_PRO", "단백질", "단"], ["INFO_FAT", "지방", "지"]];
    return <span className={compact ? "planner-macros planner-macros--compact" : "planner-macros"} aria-label="탄수화물 단백질 지방 원문 수치">{labels.map(([key, label, short]) => <span key={key}><span>{compact ? short : label}</span><b>{evidence?.nutrition?.[key]?.trim() || "—"}</b></span>)}</span>;
}

export default function WeeklyPlanner({ preview = false }) {
    const demo = import.meta.env.DEV && preview;
    const [week, setWeek] = useState(monday);
    const [preferences, setPreferences] = useState(() => defaults(monday()));
    const [events, setEvents] = useState([]);
    const [revision, setRevision] = useState(0);
    const [dirty, setDirty] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");
    const [notices, setNotices] = useState([]);
    const [busy, setBusy] = useState("");
    const [loaded, setLoaded] = useState(false);
    const [reload, setReload] = useState(0);
    const previewWeeks = useRef(new Map());
    const operation = useRef(false);
    const editor = useRef(null);
    useEffect(() => { if (selected) editor.current?.scrollIntoView({ block: "nearest" }); }, [selected]);
    useEffect(() => {
        let active = true;
        async function load() {
            setLoaded(false); setError(""); setBusy("load"); setSelected(null);
            try {
                const saved = demo ? previewWeeks.current.get(week) : await loadWeek(week);
                if (!active) return;
                setPreferences(saved?.preferences || defaults(week)); setEvents(saved?.events || []);
                setRevision(saved?.revision || 0); setDirty(false); setNotices([]); setStatus(saved ? "저장한 일정을 불러왔어요." : "생활 리듬에 맞는 한 주를 만들어 보세요."); setLoaded(true);
            } catch (err) { if (active) setError(err.response?.data?.message || "저장된 일정을 불러오지 못했어요. 다시 불러와 주세요."); }
            finally { if (active) setBusy(""); }
        }
        load(); return () => { active = false; };
    }, [week, demo, reload]);
    useEffect(() => {
        if (!dirty) return;
        const warn = event => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);
    const update = (key, value) => { setPreferences(p => ({ ...p, [key]: value })); setDirty(true); setStatus(""); };
    const edit = (id, change) => { setEvents(items => items.map(item => item.id === id ? { ...item, ...change, foodEvidence: ("title" in change || "details" in change || "kind" in change) ? null : item.foodEvidence } : item)); setDirty(true); setStatus(""); };
    function toggleExerciseDay(day, checked) {
        setPreferences(p => ({ ...p, exerciseDays: checked ? [...p.exerciseDays, day] : p.exerciseDays.filter(d => d !== day), exerciseWindows: checked ? (p.exerciseWindows || []) : (p.exerciseWindows || []).filter(w => w.day !== day) }));
        setDirty(true); setStatus("");
    }
    function updateExerciseWindow(day, key, value) {
        const windows = preferences.exerciseWindows || [];
        const current = windows.find(window => window.day === day) || { day, start: preferences.wakeTime, end: preferences.sleepTime };
        update("exerciseWindows", [...windows.filter(window => window.day !== day), { ...current, [key]: value }]);
    }
    function changeWeek(offset) {
        if (dirty && !window.confirm("저장하지 않은 변경을 버리고 다른 주로 이동할까요?")) return;
        setWeek(value => shiftDate(value, offset));
    }
    async function generate(event) {
        event.preventDefault();
        if (operation.current) return;
        const invalid = validatePlan(preferences, []);
        if (invalid) return setError(invalid);
        if (events.length && !window.confirm("현재 초안을 새 계획으로 바꿀까요? 저장된 일정은 확정 저장 전까지 유지됩니다.")) return;
        operation.current = true; setBusy("generate"); setError(""); setSelected(null);
        try {
            const result = demo ? exampleWeek(preferences) : await generateWeek(preferences);
            const conflict = validatePlan(preferences, result.events);
            if (conflict) throw new Error(conflict);
            setEvents(result.events); setNotices(result.notices || []); setDirty(true); setFormOpen(false);
            setStatus(demo ? "샘플 계획이에요. 일정을 눌러 수정해 보세요." : "공식 레시피를 검색해 초안을 만들었어요. 식사 일정을 눌러 재료와 출처를 확인하고 확정해 주세요.");
        } catch (err) { setError(err.response?.data?.message || err.message || "계획을 생성하지 못했어요."); }
        finally { operation.current = false; setBusy(""); }
    }
    async function save() {
        if (operation.current) return;
        const invalid = validatePlan(preferences, events);
        if (invalid) return setError(invalid);
        operation.current = true; setBusy("save"); setError("");
        try {
            const payload = { revision, preferences, events };
            const saved = demo ? { ...payload, revision: revision + 1 } : await saveWeek(payload);
            if (demo) previewWeeks.current.set(week, structuredClone(saved));
            setRevision(saved.revision); setDirty(false);
            setStatus(demo ? "미리보기 안에서 저장했어요. 새로고침하면 초기화됩니다." : "주간 캘린더에 저장했어요.");
        } catch (err) { setError(err.response?.data?.message || "저장하지 못했어요. 변경 내용은 화면에 남아 있습니다."); }
        finally { operation.current = false; setBusy(""); }
    }
    const chosen = events.find(event => event.id === selected);
    const count = events.filter(event => event.completed).length;
    return <section className="weekly-planner" aria-labelledby="planner-title" aria-busy={!!busy}>
        <header className="planner-heading"><div><span className="planner-eyebrow">A WEEK FOR YOU</span><h2 id="planner-title">내 일상에 맞춘 AI 플래너</h2><p>먹는 시간도, 움직이는 시간도. 나의 생활 리듬에 맞게.</p></div><button type="button" className="planner-primary" disabled={!!busy || !loaded} onClick={() => setFormOpen(!formOpen)} aria-expanded={formOpen} aria-controls="planner-settings">{formOpen ? "입력 닫기" : events.length ? "생활 정보 수정" : "나의 한 주 만들기"} <span aria-hidden="true">↗</span></button></header>
        {demo && <p className="planner-demo">디자인 미리보기 · AI 호출과 DB 저장 없이 샘플 일정으로 체험합니다.</p>}
        <div className="planner-week-nav"><div><button type="button" aria-label="이전 주" disabled={!!busy} onClick={() => changeWeek(-7)}>‹</button><strong>{week.replaceAll("-", ".")} — {shiftDate(week, 6).slice(5).replace("-", ".")}</strong><button type="button" aria-label="다음 주" disabled={!!busy} onClick={() => changeWeek(7)}>›</button></div><span>{events.length ? `${count}/${events.length} 완료 · ${dirty ? "저장 전 변경" : "저장됨"}` : "주간 일정"}</span></div>
        {error && <div className="planner-error" role="alert">{error} <button type="button" disabled={!!busy} onClick={() => { if (!dirty || window.confirm("변경 내용을 버리고 저장된 일정을 불러올까요?")) setReload(value => value + 1); }}>다시 불러오기</button></div>}
        <p className="planner-status" role="status">{busy === "generate" ? "선호와 일정을 살펴보고 한 주를 구성하고 있어요…" : busy === "load" ? "주간 일정 불러오는 중…" : busy === "save" ? "저장하는 중…" : status}</p>
        {formOpen && <form id="planner-settings" onSubmit={generate} className="planner-settings"><fieldset disabled={!!busy || !loaded}><legend>01 · 생활 리듬</legend><div className="planner-form-grid">{[["wakeTime", "기상"], ["sleepTime", "취침"], ["breakfastTime", "아침 식사"], ["lunchTime", "점심 식사"], ["dinnerTime", "저녁 식사"], ["exerciseTime", "선호 운동 시간"]].map(([key, label]) => <label key={key}>{label}<input type="time" required value={preferences[key]} onChange={event => update(key, event.target.value)} /></label>)}</div><p className="planner-help">현재는 같은 날 기상·취침하는 일정을 지원해요. 시간은 한국 시간 기준입니다.</p></fieldset>
            <fieldset disabled={!!busy}><legend>02 · 운동과 식사 선호</legend><div className="planner-form-grid"><label>운동 경험<select value={preferences.experience} onChange={event => update("experience", event.target.value)}><option>초보</option><option>가끔 운동</option><option>규칙적으로 운동</option></select></label><label>희망 강도<select value={preferences.intensity} onChange={event => update("intensity", event.target.value)}><option>가볍게</option><option>보통</option></select></label><label>1회 운동 시간 (분)<input type="number" min="10" max="90" required value={preferences.exerciseMinutes} onChange={event => update("exerciseMinutes", Number(event.target.value))} /></label></div><div className="planner-days" aria-label="운동할 요일">{DAYS.map((day, index) => <label key={day}><input type="checkbox" checked={preferences.exerciseDays.includes(index)} onChange={event => toggleExerciseDay(index, event.target.checked)} />{day}</label>)}</div><div className="planner-exercise-windows"><h4>요일별 운동 가능 시간</h4><p className="planner-help">선택한 시간 안에서 고정 일정·식사와 겹치지 않게 배치해요. 지정하지 않은 요일은 기상부터 취침까지로 설정됩니다.</p>{[...preferences.exerciseDays].sort((a,b) => a-b).map(day => {
                const window = (preferences.exerciseWindows || []).find(w => w.day === day);
                return <div className="planner-exercise-window" key={day}><strong>{DAYS[day]}요일</strong><label>시작<input aria-label={`${DAYS[day]}요일 운동 가능 시작`} type="time" required value={window?.start || preferences.wakeTime} onChange={event => updateExerciseWindow(day,"start",event.target.value)} /></label><span>—</span><label>종료<input aria-label={`${DAYS[day]}요일 운동 가능 종료`} type="time" required value={window?.end || preferences.sleepTime} onChange={event => updateExerciseWindow(day,"end",event.target.value)} /></label></div>;
            })}{!preferences.exerciseDays.length && <p className="planner-help">운동할 요일을 선택하면 가능한 시간을 지정할 수 있어요.</p>}</div><div className="planner-form-grid"><label>음식·운동 선호<textarea maxLength={1000} placeholder="예: 조리 시간 15분, 집에서 할 수 있는 운동" value={preferences.preferences} onChange={event => update("preferences", event.target.value)} /></label><label>음식 알레르기·피할 식품<textarea maxLength={1000} placeholder="해당 사항이 없으면 없음" value={preferences.allergies} onChange={event => update("allergies", event.target.value)} /></label><label>의료진의 제한·몸 상태<textarea maxLength={1000} placeholder="예: 무릎 부담을 피하도록 안내받음" value={preferences.limitations} onChange={event => update("limitations", event.target.value)} /></label></div></fieldset>
            <fieldset disabled={!!busy}><legend>03 · 이미 정해진 일정</legend><p className="planner-help">출근·수업처럼 비워 둘 시간을 추가해 주세요. 점심시간은 고정 일정에서 빼 주세요.</p>{preferences.busySlots.map((slot, index) => <div className="planner-busy-row" key={index}><select aria-label={`고정 일정 ${index + 1} 요일`} value={slot.day} onChange={event => update("busySlots", preferences.busySlots.map((s, i) => i === index ? { ...s, day: Number(event.target.value) } : s))}>{DAYS.map((day, d) => <option value={d} key={day}>{day}요일</option>)}</select><input aria-label={`고정 일정 ${index + 1} 제목`} required maxLength={60} value={slot.title} onChange={event => update("busySlots", preferences.busySlots.map((s, i) => i === index ? { ...s, title: event.target.value } : s))} />{["start", "end"].map(key => <input key={key} aria-label={`고정 일정 ${index + 1} ${key === "start" ? "시작" : "종료"}`} type="time" required value={slot[key]} onChange={event => update("busySlots", preferences.busySlots.map((s, i) => i === index ? { ...s, [key]: event.target.value } : s))} />)}<button type="button" aria-label={`고정 일정 ${index + 1} 삭제`} onClick={() => update("busySlots", preferences.busySlots.filter((_, i) => i !== index))}>×</button></div>)}<button type="button" className="planner-secondary" disabled={preferences.busySlots.length >= 35} onClick={() => update("busySlots", [...preferences.busySlots, { day: 0, title: "업무", start: "09:00", end: "12:00" }])}>＋ 고정 일정 추가</button></fieldset>
            <label className="planner-consent"><input type="checkbox" required={!demo} checked={preferences.aiConsent} onChange={event => update("aiConsent", event.target.checked)} />입력한 음식 선호·알레르기·몸 상태·운동 정보를 Gemini에 전송해 계획 초안을 만드는 데 동의합니다. 이름·연락처는 적지 마세요.</label><button className="planner-primary" disabled={!!busy || !loaded} type="submit">{busy === "generate" ? "계획 만드는 중…" : demo ? "샘플 주간 계획 만들기" : "AI 주간 계획 만들기"}</button></form>}
        <div className="planner-legend"><span>● 식사</span><span>● 운동</span><span>● 고정 일정</span><small>일정을 누르면 수정할 수 있어요</small><button type="button" className="planner-secondary" disabled={!!busy || !loaded || events.length >= 64} onClick={() => { const id = crypto.randomUUID(); const start = `${week}T${preferences.wakeTime}`; const endDate = new Date(start); endDate.setMinutes(endDate.getMinutes() + 30); const end = `${week}T${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`; setEvents(items => [...items, { id, kind: "MEAL", title: "새 식사 일정", details: "", start, end, intensity: "", completed: false }]); setDirty(true); setSelected(id); }}>＋ 일정 추가</button></div>
        <div className="planner-calendar" role="region" aria-label="주간 식사 운동 캘린더" tabIndex={0}><div className="planner-calendar-grid">{DAYS.map((day, index) => {
            const date = shiftDate(week, index), dayEvents = events.filter(e => e.start.slice(0, 10) === date).sort((a, b) => a.start.localeCompare(b.start));
            const calories = mealCalories(dayEvents);
            const timeline = [...dayEvents, ...preferences.busySlots.filter(slot => slot.day === index).map((slot, i) => ({ ...slot, id: `fixed-${i}`, fixed: true, start: `${date}T${slot.start}`, end: `${date}T${slot.end}` }))].sort((a, b) => a.start.localeCompare(b.start));
            return <section className="planner-day" key={day} aria-label={`${date} ${day}요일`}><header className="planner-day-heading"><h3><span>{day}</span>{Number(date.slice(-2))}</h3><span className="planner-day-calories" title="등록된 식사 레시피의 원문 열량 합계" aria-label={`${day}요일 식사 열량 ${calories.total === null ? "정보 없음" : `${calories.total} 킬로칼로리${calories.partial ? ", 일부 식사만 집계" : ""}`}`}>{calories.total === null ? "— kcal" : `${calories.total.toLocaleString()} kcal`}{calories.partial && calories.total !== null && <sup>*</sup>}</span></header>{timeline.map(event => event.fixed ? <div className="planner-fixed" key={event.id}><small>{event.start.slice(11, 16)}–{event.end.slice(11, 16)}</small>{event.title}</div> : <div key={event.id} className={`planner-event planner-event--${event.kind.toLowerCase()}${event.completed ? " planner-event--done" : ""}`}><button type="button" disabled={!!busy} onClick={() => setSelected(event.id)}><small>{event.start.slice(11, 16)}–{event.end.slice(11, 16)}</small><strong title={event.title}>{event.title}</strong></button><label><input type="checkbox" disabled={!!busy} checked={event.completed} onChange={change => edit(event.id, { completed: change.target.checked })} aria-label={`${event.title} 완료`} /><span className="planner-sr-only">완료</span></label></div>)}{!timeline.length && <p className="planner-no-event">계획을 추가해 보세요</p>}</section>;
        })}</div></div>
        <p className="planner-calorie-note">열량은 등록된 레시피의 원문 합계예요. 실제 섭취량과 다를 수 있어요. * 일부 식사만 집계 · — 영양정보 없음</p>
        {chosen && <section className="planner-editor planner-detail" ref={editor} aria-label="일정 상세">
            <header className="planner-detail-heading"><div><span className="planner-detail-kicker">{chosen.kind === "MEAL" ? "식사" : "운동"} · {chosen.start.slice(5,10).replace("-", ".")} · {chosen.start.slice(11,16)}–{chosen.end.slice(11,16)}</span><h3>{chosen.title}</h3></div><button type="button" className="planner-detail-close" aria-label="편집 닫기" onClick={() => setSelected(null)}>×</button></header>
            {chosen.kind === "MEAL" ? <>
                <div className="planner-detail-nutrients"><div className="planner-energy"><span>열량 · 원문</span><strong>{chosen.foodEvidence?.nutrition?.INFO_ENG?.trim() || "—"}<small> kcal</small></strong></div><Macros evidence={chosen.foodEvidence} /></div>
                {chosen.foodEvidence ? <>
                    <p className="planner-detail-caption">레시피 원문 기준 · 개인별 권장량이 아닙니다.</p>
                    <details className="planner-detail-disclosure"><summary>재료와 영양 기준</summary><p>{chosen.foodEvidence.ingredients}</p><div className="planner-detail-meta"><span>원문 중량 <b>{chosen.foodEvidence.servingWeight || "미제공"}</b></span><span>나트륨 <b>{chosen.foodEvidence.nutrition.INFO_NA || "미제공"}</b></span></div><p className="planner-help">단위·기준량은 원문을 확인해 주세요. 중량이 없는 자료는 1인분으로 환산하지 않습니다.</p></details>
                    <details className="planner-detail-disclosure"><summary>출처 확인</summary><p>식품안전나라 · 레시피 {chosen.foodEvidence.recipeId} · {chosen.foodEvidence.retrievedAt.slice(0,10)} 수집</p>{chosen.foodEvidence.sourceUrl === "https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_no=661&svc_no=COOKRCP01" && <a href={chosen.foodEvidence.sourceUrl} target="_blank" rel="noreferrer">레시피 DB 원문 보기 ↗</a>}</details>
                </> : <p className="planner-detail-caption">연결된 영양정보가 없습니다. 새 식단을 생성하면 확인할 수 있어요.</p>}
            </> : <div className="planner-workout-summary"><span>{chosen.intensity}</span><p>{chosen.details}</p></div>}
            <details className="planner-detail-disclosure planner-edit-disclosure"><summary>시간·내용 수정</summary><p className="planner-help">메뉴나 내용을 수정하면 연결된 영양정보가 해제됩니다.</p><fieldset disabled={!!busy}><div className="planner-form-grid"><label>종류<select value={chosen.kind} onChange={event => edit(chosen.id, { kind: event.target.value, intensity: event.target.value === "EXERCISE" ? "가볍게" : "" })}><option value="MEAL">식사</option><option value="EXERCISE">운동</option></select></label><label>제목<input maxLength={60} value={chosen.title} onChange={event => edit(chosen.id, { title: event.target.value })} /></label><label>시작<input type="datetime-local" value={chosen.start.slice(0, 16)} onChange={event => edit(chosen.id, { start: event.target.value })} /></label><label>종료<input type="datetime-local" value={chosen.end.slice(0, 16)} onChange={event => edit(chosen.id, { end: event.target.value })} /></label>{chosen.kind === "EXERCISE" && <label>강도<select value={chosen.intensity} onChange={event => edit(chosen.id, { intensity: event.target.value })}><option>가볍게</option><option>보통</option></select></label>}</div><label>상세 계획<textarea maxLength={500} value={chosen.details} onChange={event => edit(chosen.id, { details: event.target.value })} /></label><div className="planner-editor-actions"><button type="button" onClick={() => { setEvents(items => items.filter(item => item.id !== chosen.id)); setDirty(true); setSelected(null); }}>일정 삭제</button></div></fieldset></details>
        </section>}
        {!!notices.length && <details className="planner-notices"><summary>일정 조정 안내 {notices.length}건</summary><ul>{notices.map((notice, i) => <li key={i}>{notice}</li>)}</ul></details>}
        <footer className="planner-footer"><p>생활 계획을 위한 참고 초안이에요. 알레르기와 의료진의 제한을 확인하고 확정해 주세요. 투약 일정은 변경하지 않아요.</p><button type="button" className="planner-primary" disabled={!!busy || !loaded || !dirty} onClick={save}>{demo ? "미리보기에서 확정" : "확정하고 저장"}</button></footer>
    </section>;
}
