import Shell from "../components/Shell.jsx";
import PwaBanners from "../components/PwaBanners.jsx";
import WeightChart from "../components/WeightChart.jsx";
import { IconScale, IconMeal, IconExercise, IconInjection, IconChevron, IconPlanner } from "../components/Icons.jsx";

// Last 7 days ending today (화, 9/15) — the line's own first/last points
// ARE the "시작/현재" relationship, so no separate goal-reference line is
// needed on the home screen. Values reconciled with the existing "▼0.6kg
// · 이번 주" delta above (73.0 → 72.4 = -0.6), which the old sparkline's
// data did not actually match (was 월-일 fixed labels ending Sunday while
// "today" is Tuesday).
const WEIGHT_WEEK = [
    { label: "수", date: "9월 9일", value: 73.0 },
    { label: "목", date: "9월 10일", value: 72.9 },
    { label: "금", date: "9월 11일", value: 72.8 },
    { label: "토", date: "9월 12일", value: 72.7 },
    { label: "일", date: "9월 13일", value: 72.6 },
    { label: "월", date: "9월 14일", value: 72.5 },
    { label: "화", date: "9월 15일", value: 72.4 },
];

const QUICK_ACTIONS = [
    { Icon: IconScale, label: "체중 기록" },
    { Icon: IconMeal, label: "식단 기록" },
    { Icon: IconExercise, label: "운동 기록" },
    { Icon: IconInjection, label: "투약 기록" },
];

const TODAY_RECORDS = [
    { time: "07:40", title: "아침 · 오트밀 + 그릭요거트", meta: "420 kcal · 단백질 28g", Icon: IconMeal },
    { time: "12:20", title: "점심 · 닭가슴살 샐러드", meta: "560 kcal · 단백질 42g", Icon: IconMeal },
    { time: "18:00", title: "유산소 30분", meta: "완료 · 소모 260 kcal", Icon: IconExercise },
];

const PLANNER_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

export default function Dashboard() {
    return (
        <Shell activeKey="home">
            <PwaBanners />

            <div className="dp-page-header">
                <span className="dp-page-context"><IconPlanner />2026년 9월 15일 화요일</span>
                <h1 className="dp-page-heading">안녕하세요, 세민님</h1>
            </div>

            {/* ================================================= */}
            {/* Two information zones on desktop: health (today's    */}
            {/* status + weekly rhythm) on the left, action (quick    */}
            {/* log + what's next) on the right. Both columns stack   */}
            {/* two cards each so their total visual mass stays close */}
            {/* — a 2-col grid alone doesn't balance a screen; what's  */}
            {/* IN each column does. Verified via Playwright bounding  */}
            {/* rects, not eyeballed. Mobile: one natural column.      */}
            {/* ================================================= */}
            <div className="dp-zone-grid" style={{ marginBottom: "var(--dp-space-6)" }}>
                <div className="dp-zone-stack">
                <section id="today" className="dp-card" style={{ scrollMarginTop: 84 }}>
                    <p className="dp-card-title" style={{ marginBottom: "var(--dp-space-3)" }}>오늘의 건강 상태</p>

                    {/* One health-metric block: current weight, this-week   */}
                    {/* delta, and the trend line that produced that delta —  */}
                    {/* not a number and a decorative sparkline side by side. */}
                    <div>
                        <span className="dp-metric-label">현재 체중</span>
                        <span className="dp-record-value">72.4<small>kg</small></span>
                        <div style={{ marginTop: 4 }}>
                            <span className="dp-record-delta">▼ 0.6kg · 이번 주</span>
                        </div>

                        <div className="dp-chart-head">
                            <span className="dp-chart-period">9.9 – 9.15 · 7일간</span>
                            <a href="/design-preview/dashboard" className="dp-section-link" style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 12 }}>전체 기록<IconChevron style={{ width: 12, height: 12 }} /></a>
                        </div>
                        <WeightChart data={WEIGHT_WEEK} />
                    </div>

                    <div className="dp-record-secondary">
                        <div className="dp-record-stat">
                            <span className="dp-record-stat-icon"><IconMeal /></span>
                            <span className="dp-record-stat-body">
                                <span className="dp-metric-label">오늘 섭취</span>
                                <span className="dp-record-stat-value">1,480<small>/ 1,600kcal</small></span>
                            </span>
                        </div>
                        <div className="dp-record-stat">
                            <span className="dp-record-stat-icon"><IconExercise /></span>
                            <span className="dp-record-stat-body">
                                <span className="dp-metric-label">오늘 운동</span>
                                <span className="dp-record-stat-value">30<small>분 · 260kcal</small></span>
                            </span>
                        </div>
                        <div className="dp-record-stat">
                            <span className="dp-record-stat-icon"><IconInjection /></span>
                            <span className="dp-record-stat-body">
                                <span className="dp-metric-label">다음 투약</span>
                                <span className="dp-record-stat-value">D-2</span>
                            </span>
                        </div>
                    </div>
                </section>

                <section className="dp-card">
                    <div className="dp-section-head" style={{ marginBottom: "var(--dp-space-3)" }}>
                        <p className="dp-card-title" style={{ margin: 0 }}>이번 주 플래너</p>
                        <a href="/design-preview/planner" className="dp-section-link" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>전체 보기<IconChevron style={{ width: 13, height: 13 }} /></a>
                    </div>
                    <p className="dp-field-help" style={{ marginBottom: 12 }}>월~일 · 5/7일 완료</p>
                    <div style={{ display: "flex", gap: 8 }}>
                        {PLANNER_DAYS.map((d, i) => (
                            <div
                                key={d}
                                style={{
                                    flex: 1, textAlign: "center", padding: "10px 0", borderRadius: "var(--dp-radius-sm)",
                                    fontSize: 12.5, fontWeight: 700,
                                    background: i === 1 ? "var(--color-primary-soft)" : "transparent",
                                    color: i === 1 ? "var(--dp-accent-hero)" : i < 5 ? "var(--dp-ink-secondary)" : "var(--dp-text-muted)",
                                }}
                            >
                                {d}
                            </div>
                        ))}
                    </div>
                </section>
                </div>

                <div className="dp-zone-stack">
                    <section className="dp-card">
                        <p className="dp-card-title">바로 기록하기</p>
                        <div className="dp-action-grid">
                            <button type="button" className="dp-action-tile dp-action-primary">
                                <span className="dp-action-icon"><IconScale /></span>
                                <span>체중 기록</span>
                            </button>
                            <div className="dp-action-row">
                                {QUICK_ACTIONS.slice(1).map(({ Icon, label }) => (
                                    <button key={label} type="button" className="dp-action-tile">
                                        <span className="dp-action-icon"><Icon /></span>
                                        <span>{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="dp-card">
                        <p className="dp-card-title">다음 일정</p>
                        <div className="dp-list-row" style={{ justifyContent: "flex-start", minHeight: 0, padding: "0 0 12px" }}>
                            <div style={{ flex: 1 }}>
                                <div className="dp-list-row-title" style={{ fontSize: 14 }}>위고비 투약</div>
                                <div className="dp-list-row-meta">9월 17일 목요일 · D-2</div>
                            </div>
                        </div>
                        <hr className="dp-divider" style={{ margin: "0 0 12px" }} />
                        <div className="dp-list-row" style={{ justifyContent: "flex-start", minHeight: 0, padding: 0 }}>
                            <div style={{ flex: 1 }}>
                                <div className="dp-list-row-title" style={{ fontSize: 14 }}>청담 웰니스의원 예약</div>
                                <div className="dp-list-row-meta">9월 22일 화요일 · 14:30</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* ================================================= */}
            {/* Today's records — an activity timeline (time+icon    */}
            {/* anchor rail), not a divider-row list. Capped width    */}
            {/* so desktop doesn't stretch each row thin.             */}
            {/* ================================================= */}
            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">오늘의 기록</h2></div>
                <div className="dp-timeline">
                    {TODAY_RECORDS.map((record) => (
                        <div className="dp-timeline-item" key={record.title}>
                            <span className="dp-timeline-anchor"><record.Icon /></span>
                            <div className="dp-timeline-body">
                                <div className="dp-timeline-top">
                                    <span className="dp-timeline-time">{record.time}</span>
                                    <span className="dp-timeline-title">{record.title}</span>
                                </div>
                                <div className="dp-timeline-meta">{record.meta}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="dp-section" style={{ borderBottom: "none" }}>
                <p className="dp-field-help">
                    본 대시보드는 참고용 건강 기록이며 의학적 진단을 대체하지 않습니다.
                </p>
            </section>
        </Shell>
    );
}
