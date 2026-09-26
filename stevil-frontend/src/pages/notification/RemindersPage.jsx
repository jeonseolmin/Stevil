import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LoginRequired from "./LoginRequired";
import {
    createReminder,
    deleteReminder,
    fetchReminders,
    reminderErrorMessage,
    setReminderEnabled,
    updateReminder,
} from "../../api/reminderApi";
import "./notification.css";

const USER_LIMIT = 20;
const LABEL_MAX = 50;

const TYPES = [
    ["MEAL", "식사"],
    ["EXERCISE", "운동"],
    ["INJECTION", "주사"],
    ["WEIGHT", "체중 기록"],
];
const MEAL_TYPES = [
    ["BREAKFAST", "아침"],
    ["LUNCH", "점심"],
    ["DINNER", "저녁"],
    ["SNACK", "간식"],
];
const DAYS = [
    ["MONDAY", "월"],
    ["TUESDAY", "화"],
    ["WEDNESDAY", "수"],
    ["THURSDAY", "목"],
    ["FRIDAY", "금"],
    ["SATURDAY", "토"],
    ["SUNDAY", "일"],
];

const typeLabel = (type) => TYPES.find(([key]) => key === type)?.[1] || type;
const mealLabel = (meal) => MEAL_TYPES.find(([key]) => key === meal)?.[1];
const dayLabel = (day) => DAYS.find(([key]) => key === day)?.[1] || day;
const hhmm = (time) => (time ? String(time).slice(0, 5) : "");

function title(reminder) {
    if (reminder.type === "MEAL" && reminder.mealType === "SNACK") {
        return "간식";
    }
    const meal = mealLabel(reminder.mealType);
    return reminder.type === "MEAL" && meal ? `${meal} 식사` : typeLabel(reminder.type);
}

function nextFire(reminder) {
    if (!reminder.enabled) {
        return "꺼져 있음";
    }
    if (!reminder.nextFireAt) {
        return "예정된 알림 없음";
    }
    const date = new Date(reminder.nextFireAt);
    return `다음 알림 ${date.toLocaleString("ko-KR", {
        month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
    })}`;
}

const EMPTY_FORM = { type: "MEAL", mealType: "BREAKFAST", scheduledTime: "08:00", daysOfWeek: DAYS.map(([d]) => d), label: "" };

function validate(form) {
    if (form.type === "MEAL" && !form.mealType) {
        return "식사 종류를 골라 주세요.";
    }
    if (!/^\d{2}:\d{2}$/.test(form.scheduledTime)) {
        return "시간을 입력해 주세요.";
    }
    if (form.daysOfWeek.length === 0) {
        return "요일을 하나 이상 골라 주세요.";
    }
    if (form.label.trim().length > LABEL_MAX) {
        return `이름은 ${LABEL_MAX}자까지 쓸 수 있어요.`;
    }
    return "";
}

function toBody(form) {
    return {
        type: form.type,
        mealType: form.type === "MEAL" ? form.mealType : null,
        scheduledTime: form.scheduledTime,
        daysOfWeek: DAYS.map(([d]) => d).filter((d) => form.daysOfWeek.includes(d)),
        label: form.label.trim() || null,
    };
}

/* USER 알림 생성/수정 폼. 시간대는 Asia/Seoul 고정(서버 기본값). */
function ReminderForm({ initial, submitLabel, onSubmit, onCancel }) {
    const [form, setForm] = useState(initial);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
    const toggleDay = (day) =>
        set({ daysOfWeek: form.daysOfWeek.includes(day) ? form.daysOfWeek.filter((d) => d !== day) : [...form.daysOfWeek, day] });

    const submit = async (event) => {
        event.preventDefault();
        const problem = validate(form);
        if (problem) {
            setError(problem);
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSubmit(toBody(form));
        } catch (e) {
            setError(reminderErrorMessage(e));
            setSaving(false);
        }
    };

    return (
        <form className="reminder-form" onSubmit={submit}>
            <label>
                종류
                <select value={form.type} onChange={(e) => set({ type: e.target.value })}>
                    {TYPES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                </select>
            </label>
            {form.type === "MEAL" && (
                <label>
                    식사 종류
                    <select value={form.mealType || ""} onChange={(e) => set({ mealType: e.target.value })}>
                        {MEAL_TYPES.map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                    </select>
                </label>
            )}
            <label>
                시간
                <input type="time" value={form.scheduledTime} onChange={(e) => set({ scheduledTime: e.target.value })} required />
            </label>
            <div>
                <p className="noti-section__hint">요일</p>
                <div className="reminder-days" role="group" aria-label="요일">
                    {DAYS.map(([day, name]) => (
                        <button
                            key={day}
                            type="button"
                            className={`reminder-day ${form.daysOfWeek.includes(day) ? "reminder-day--on" : ""}`}
                            aria-pressed={form.daysOfWeek.includes(day)}
                            onClick={() => toggleDay(day)}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>
            <label>
                이름 (선택, 알림 내용에 표시)
                <input value={form.label} maxLength={LABEL_MAX} onChange={(e) => set({ label: e.target.value })} placeholder="예: 물 한 컵 마시기" />
            </label>
            {error && <p className="noti-error" role="alert">{error}</p>}
            <div className="reminder-form__actions">
                <button type="submit" className="noti-button noti-button--primary" disabled={saving}>
                    {saving ? "저장 중..." : submitLabel}
                </button>
                <button type="button" className="noti-button" onClick={onCancel} disabled={saving}>취소</button>
            </div>
            <p className="noti-section__hint">시간대: 한국 시간(Asia/Seoul)</p>
        </form>
    );
}

/* PLANNER 알림: 삭제 대신 끄기, 시간은 계획을 따르거나 직접 고정(timeOverride). */
function PlannerReminder({ reminder, onChanged, onError }) {
    const [editing, setEditing] = useState(false);
    const [time, setTime] = useState(hhmm(reminder.timeOverride) || "12:00");

    const save = async (timeOverride) => {
        try {
            onChanged(await updateReminder(reminder.id, { timeOverride }));
            setEditing(false);
        } catch (e) {
            onError(reminderErrorMessage(e));
        }
    };

    const slots = (reminder.plannedSlots || [])
        .map((s) => `${new Date(`${s.date}T00:00`).toLocaleDateString("ko-KR", { weekday: "short" })} ${hhmm(s.time)}`)
        .join(", ");

    return (
        <>
            <p className="reminder-card__meta">
                {reminder.timeOverride ? `매번 ${hhmm(reminder.timeOverride)}로 고정` : "계획된 시간에 알림"}
                {slots && ` · 이번 계획: ${slots}`}
            </p>
            {editing ? (
                <div className="reminder-card__actions">
                    <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="고정할 시간" />
                    <button type="button" className="noti-button noti-button--primary" onClick={() => save(time)}>저장</button>
                    <button type="button" className="noti-button" onClick={() => setEditing(false)}>취소</button>
                </div>
            ) : (
                <div className="reminder-card__actions">
                    <button type="button" className="noti-button" onClick={() => setEditing(true)}>시간 고정</button>
                    {reminder.timeOverride && (
                        <button type="button" className="noti-button" onClick={() => save(null)}>계획 시간 따르기</button>
                    )}
                </div>
            )}
        </>
    );
}

export default function RemindersPage() {
    if (!localStorage.getItem("accessToken")) {
        return <LoginRequired title="알림 시간 설정" />;
    }
    return <Reminders />;
}

function Reminders() {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        let alive = true;
        fetchReminders()
            .then((data) => alive && setReminders(data))
            .catch(() => alive && setError("알림 목록을 불러오지 못했어요."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    const replace = (updated) => setReminders((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

    const toggle = async (reminder) => {
        setError("");
        try {
            replace(await setReminderEnabled(reminder.id, !reminder.enabled));
        } catch (e) {
            setError(reminderErrorMessage(e));
        }
    };

    const remove = async (reminder) => {
        if (!window.confirm(`'${reminder.label || title(reminder)}' 알림을 삭제할까요?`)) {
            return;
        }
        setError("");
        try {
            await deleteReminder(reminder.id);
            setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
        } catch (e) {
            setError(reminderErrorMessage(e));
        }
    };

    const planner = reminders.filter((r) => r.source === "PLANNER");
    const mine = reminders.filter((r) => r.source === "USER");

    const card = (reminder, body) => (
        <li key={reminder.id} className={`reminder-card ${reminder.enabled ? "" : "reminder-card--off"}`}>
            <div className="reminder-card__top">
                <span className="reminder-card__title">{reminder.label || title(reminder)}</span>
                <label className="reminder-toggle">
                    <input type="checkbox" checked={reminder.enabled} onChange={() => toggle(reminder)} />
                    {reminder.enabled ? "켜짐" : "꺼짐"}
                </label>
            </div>
            {body}
            <p className="reminder-card__meta">{nextFire(reminder)}</p>
        </li>
    );

    return (
        <div className="noti-page">
            <div className="noti-container">
                <div className="noti-header">
                    <h1>알림 시간 설정</h1>
                    <Link to="/notifications" className="noti-link">받은 알림 보기</Link>
                </div>

                {error && <p className="noti-error" role="alert">{error}</p>}

                {loading ? (
                    <p className="noti-empty">불러오는 중...</p>
                ) : (
                    <>
                        <section className="noti-section">
                            <h2>내가 만든 알림</h2>
                            <p className="noti-section__hint">식사·운동·주사·체중 기록 시간을 요일별로 정해 두면 그때 알려 드려요. (최대 {USER_LIMIT}개)</p>

                            {creating ? (
                                <ReminderForm
                                    initial={EMPTY_FORM}
                                    submitLabel="추가"
                                    onSubmit={async (body) => {
                                        const created = await createReminder({ ...body, enabled: true });
                                        setReminders((prev) => [...prev, created]);
                                        setCreating(false);
                                    }}
                                    onCancel={() => setCreating(false)}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="noti-button noti-button--primary"
                                    onClick={() => setCreating(true)}
                                    disabled={mine.length >= USER_LIMIT}
                                >
                                    {mine.length >= USER_LIMIT ? `최대 ${USER_LIMIT}개까지 만들 수 있어요` : "+ 알림 추가"}
                                </button>
                            )}

                            <ul className="noti-list" style={{ marginTop: 12 }}>
                                {mine.map((reminder) =>
                                    editingId === reminder.id ? (
                                        <li key={reminder.id}>
                                            <ReminderForm
                                                initial={{
                                                    type: reminder.type,
                                                    mealType: reminder.mealType || "BREAKFAST",
                                                    scheduledTime: hhmm(reminder.scheduledTime),
                                                    daysOfWeek: reminder.daysOfWeek || [],
                                                    label: reminder.label || "",
                                                }}
                                                submitLabel="저장"
                                                onSubmit={async (body) => {
                                                    replace(await updateReminder(reminder.id, body));
                                                    setEditingId(null);
                                                }}
                                                onCancel={() => setEditingId(null)}
                                            />
                                        </li>
                                    ) : (
                                        card(reminder, (
                                            <>
                                                <p className="reminder-card__meta">
                                                    {title(reminder)} · {hhmm(reminder.scheduledTime)} ·{" "}
                                                    {(reminder.daysOfWeek || []).length === 7
                                                        ? "매일"
                                                        : (reminder.daysOfWeek || []).map(dayLabel).join(" ")}
                                                </p>
                                                <div className="reminder-card__actions">
                                                    <button type="button" className="noti-button" onClick={() => setEditingId(reminder.id)}>수정</button>
                                                    <button type="button" className="noti-button noti-button--danger" onClick={() => remove(reminder)}>삭제</button>
                                                </div>
                                            </>
                                        ))
                                    )
                                )}
                            </ul>
                        </section>

                        <section className="noti-section">
                            <h2>계획에서 온 알림</h2>
                            <p className="noti-section__hint">주간 계획(식단)을 저장하면 계획된 식사·간식·운동 시간에 맞춰 자동으로 만들어져요. 삭제 대신 끌 수 있어요.</p>
                            {planner.length === 0 ? (
                                <p className="noti-empty">아직 계획에서 만든 알림이 없어요.</p>
                            ) : (
                                <ul className="noti-list">
                                    {planner.map((reminder) =>
                                        card(reminder, <PlannerReminder reminder={reminder} onChanged={replace} onError={setError} />)
                                    )}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
