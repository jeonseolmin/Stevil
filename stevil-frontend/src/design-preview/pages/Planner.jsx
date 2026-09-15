import Shell from "../components/Shell.jsx";
import { IconChevron, IconPlanner } from "../components/Icons.jsx";

const DAYS = [
    { d: "월", date: "09.15", state: "충족", tone: "ok" },
    { d: "화", date: "09.16", state: "충족", tone: "ok" },
    { d: "수", date: "09.17", state: "부족", tone: "warn" },
    { d: "목", date: "09.18", state: "충족", tone: "ok" },
    { d: "금", date: "09.19", state: "미확인", tone: "muted" },
    { d: "토", date: "09.20", state: "미확인", tone: "muted" },
    { d: "일", date: "09.21", state: "미확인", tone: "muted" },
];

const MEALS = [
    { time: "07:40", title: "아침 · 오트밀 + 그릭요거트", meta: "420 kcal · 단백질 28g", done: true },
    { time: "12:20", title: "점심 · 닭가슴살 샐러드", meta: "560 kcal · 단백질 42g", done: true },
    { time: "18:30", title: "저녁 · 현미밥 · 두부조림 · 나물", meta: "610 kcal · 단백질 30g", done: false },
    { time: "19:30", title: "유산소 30분", meta: "예정", done: false },
];

const PREFERENCES = ["저탄수 위주", "고단백 우선", "유제품 제외", "홈트레이닝 선호"];

export default function Planner() {
    return (
        <Shell activeKey="planner">
            <div className="dp-page-header">
                <span className="dp-page-context"><IconPlanner />내 생활 리듬에 맞춘 한 주</span>
                <h1 className="dp-page-heading">이번 주 계획</h1>
            </div>

            {/* One calendar control: prev/next + range share a header  */}
            {/* row, day chips share its background and baseline grid — */}
            {/* not two rows that happen to sit near each other. Zero    */}
            {/* top padding: the page header's own divider already sets */}
            {/* the gap, so title and control read as one region.       */}
            <section className="dp-section" style={{ paddingTop: 0 }}>
                <div className="dp-week-nav">
                    <div className="dp-week-nav-header">
                        <button type="button" className="dp-week-nav-arrow" aria-label="이전 주">
                            <IconChevron style={{ transform: "rotate(180deg)" }} />
                        </button>
                        <span className="dp-week-nav-range">09.15 – 09.21</span>
                        <button type="button" className="dp-week-nav-arrow" aria-label="다음 주">
                            <IconChevron />
                        </button>
                    </div>

                    <div className="dp-week-nav-days">
                        {DAYS.map((day, i) => (
                            <button
                                key={day.d}
                                type="button"
                                className={`dp-week-nav-day ${i === 1 ? "dp-active" : ""}`}
                                aria-label={`${day.d}요일 ${day.date}, 영양 목표 ${day.state}`}
                            >
                                <span className="dp-week-nav-day-letter" aria-hidden="true">{day.d}</span>
                                <span className="dp-week-nav-day-num" aria-hidden="true">{day.date.split(".")[1]}</span>
                                <span
                                    className="dp-status-dot"
                                    aria-hidden="true"
                                    style={{ background: i === 1 ? "rgba(255,255,255,0.85)" : day.tone === "ok" ? "var(--color-success)" : day.tone === "warn" ? "var(--color-warning)" : "var(--dp-neutral)" }}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ================================================= */}
            {/* Recommendation → decision → preference → generate.  */}
            {/* Spacing (not numbered circles/dividers) carries the */}
            {/* sequence — the target itself reads as a health goal, */}
            {/* the recommendation as a quiet suggestion beside it.  */}
            {/* ================================================= */}
            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">이번 주 목표</h2></div>

                <div className="dp-card">
                    <div className="dp-flow-step">
                        <p className="dp-flow-label">이번 주 진행</p>
                        <div className="dp-chart" style={{ height: 10 }}>
                            <div className="dp-chart-bar dp-highlight" style={{ height: "100%", flex: 45 }} />
                            <div className="dp-chart-bar" style={{ height: "100%", flex: 25, background: "var(--color-info)" }} />
                            <div className="dp-chart-bar" style={{ height: "100%", flex: 30, background: "var(--color-warning)" }} />
                        </div>
                        <p className="dp-field-help" style={{ marginTop: 8 }}>탄수화물 45% · 단백질 25% · 지방 30% (계획량 기준, 실제 섭취량 아님) · 계획 1,590kcal · 100g 단백질</p>
                    </div>

                    <div className="dp-flow-step">
                        <p className="dp-flow-label">하루 목표</p>
                        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                            <div>
                                <span className="dp-metric-label">목표 열량</span>
                                <div className="dp-target">
                                    <span className="dp-target-value">1,600</span>
                                    <span className="dp-target-unit">kcal</span>
                                </div>
                                <div className="dp-target-suggestion">
                                    Stevil 추천 1,580kcal
                                    <button type="button">적용</button>
                                </div>
                            </div>
                            <div>
                                <span className="dp-metric-label">단백질 기준</span>
                                <div className="dp-target">
                                    <span className="dp-target-value">86.9</span>
                                    <span className="dp-target-unit">g/일</span>
                                </div>
                                <div className="dp-target-suggestion">
                                    Stevil 추천 96g/일
                                    <button type="button">적용</button>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginTop: "var(--dp-space-5)" }}>
                            <label className="dp-field">
                                <span className="dp-field-label">활동 수준</span>
                                <select className="dp-select" defaultValue="moderate">
                                    <option value="low">낮음</option>
                                    <option value="moderate">보통 · 주 3~4회 운동</option>
                                    <option value="high">높음</option>
                                </select>
                            </label>
                            <label className="dp-field">
                                <span className="dp-field-label">목표 열량 직접 입력 (kcal)</span>
                                <input className="dp-input" defaultValue="1,600" inputMode="numeric" />
                            </label>
                            <label className="dp-field">
                                <span className="dp-field-label">단백질 기준 (g/kg/일)</span>
                                <input className="dp-input" defaultValue="1.20" inputMode="decimal" />
                            </label>
                        </div>

                        <label className="dp-check" style={{ marginTop: 10 }}>
                            <input type="checkbox" defaultChecked /> 열량·단백질 목표에 맞춰 추천받기
                        </label>

                        <p className="dp-field-help" style={{ marginTop: 10 }}>
                            식단 관리 목표 1,580 kcal · 96.0 g/일 — Planner 목표와 별도로 관리됩니다.
                        </p>
                    </div>

                    <div className="dp-flow-step">
                        <p className="dp-flow-label">식단·운동 선호</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {PREFERENCES.map((pref) => (
                                <span key={pref} className="dp-badge dp-badge-neutral" style={{ fontSize: 12.5, padding: "6px 12px" }}>{pref}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ================================================= */}
            {/* The result of the flow: this week's actual plan     */}
            {/* ================================================= */}
            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">화요일 일정</h2></div>
                <div>
                    {MEALS.map((meal, i) => (
                        <div key={meal.title}>
                            <div className="dp-list-row" style={{ justifyContent: "flex-start" }}>
                                <input type="checkbox" defaultChecked={meal.done} style={{ width: 20, height: 20, accentColor: "var(--dp-accent)", flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5, color: "var(--dp-text-muted)", width: 42, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{meal.time}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14.5, fontWeight: 600, textDecoration: meal.done ? "line-through" : "none", opacity: meal.done ? 0.6 : 1 }}>{meal.title}</div>
                                    <div className="dp-list-row-meta">{meal.meta}</div>
                                </div>
                            </div>
                            {i < MEALS.length - 1 && <hr className="dp-divider" style={{ margin: 0 }} />}
                        </div>
                    ))}
                </div>
            </section>

            <section className="dp-section" style={{ display: "flex", gap: 10, borderBottom: "none" }}>
                <button type="button" className="dp-btn dp-btn-secondary dp-btn-block">새 계획 만들기</button>
                <button type="button" className="dp-btn dp-btn-primary dp-btn-block">확정 저장</button>
            </section>
        </Shell>
    );
}
