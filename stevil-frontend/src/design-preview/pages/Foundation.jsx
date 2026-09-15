import { NAV_ITEMS } from "../nav.js";
import { IconScale, IconMeal, IconExercise, IconInjection } from "../components/Icons.jsx";
import PwaBanners from "../components/PwaBanners.jsx";

const COLORS = [
    ["--color-primary", "Primary (brand)"],
    ["--color-primary-dark", "Primary Dark"],
    ["--color-primary-soft", "Primary Soft"],
    ["--dp-accent-hero", "Ink-green accent (numerals, active nav, sheets)"],
    ["--dp-second", "Second accent (medication only)"],
    ["--dp-bg", "Background (warm paper)"],
    ["--dp-surface", "Surface (cards)"],
    ["--dp-surface-sunken", "Surface Sunken"],
    ["--dp-ink", "Ink (text)"],
    ["--dp-ink-secondary", "Ink Secondary"],
    ["--color-success", "Success"],
    ["--color-warning", "Warning"],
    ["--color-danger", "Danger"],
];

const RADII = [
    ["--dp-radius-sm", "sm · 8px · buttons/inputs"],
    ["--dp-radius-md", "md · 14px · cards"],
    ["--dp-radius-hero", "hero · 24px · bottom sheets / modal only"],
    ["--dp-radius-pill", "pill · badges/nav"],
];

const SPACING = [4, 8, 12, 16, 24, 32, 40, 56];

const QUICK_ACTIONS = [
    { Icon: IconScale, label: "체중" },
    { Icon: IconMeal, label: "식단" },
    { Icon: IconExercise, label: "운동" },
    { Icon: IconInjection, label: "투약" },
];

export default function Foundation() {
    return (
        <div className="dp-app" style={{ minHeight: "100vh", padding: "var(--dp-space-6) var(--dp-space-4) 80px" }}>
            <span className="dp-eyebrow">Premium Redesign · v4</span>
            <h1 className="dp-page-title">Design Foundation</h1>
            <p className="dp-page-sub">
                Warm paper surface, one real verified-loading Korean sans, cards used for genuine grouping only.
                로컬 전용 미리보기 — 실제 서비스에는 영향 없음.
            </p>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Colors</h2></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
                    {COLORS.map(([varName, label]) => (
                        <div key={varName}>
                            <div style={{
                                height: 48, borderRadius: "var(--dp-radius-md)",
                                background: `var(${varName})`, border: "1px solid var(--dp-hairline)",
                            }} />
                            <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>{label}</div>
                            <div style={{ fontSize: 11, color: "var(--dp-text-muted)" }}>{varName}</div>
                        </div>
                    ))}
                </div>
                <p className="dp-field-help" style={{ marginTop: 14 }}>
                    Rule: green is a scarce accent (primary action / active nav / progress) — not a background fill.
                    Neutral ink + warm paper carry the page; the second accent (clay) appears only for medication moments.
                </p>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Typography — one real Korean sans</h2></div>
                <p className="dp-field-help" style={{ marginBottom: 4 }}>
                    v3 used Noto Serif KR as a "signature" for numerals and titles — dropped. Verified live (Playwright):
                    the old --dp-font-display stack ("Pretendard", ...) had no matching @font-face anywhere and was
                    silently falling back to the OS default the whole time. Now: Noto Sans KR, loaded and verified,
                    for everything. Weight/size/color carry hierarchy — not a second typeface.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
                    <div><span className="dp-eyebrow">Section caption — sentence case, no tracking</span></div>
                    <div><span style={{ font: "var(--dp-text-page-title)" }}>Page title 26/bold</span></div>
                    <div><span style={{ font: "var(--dp-text-section-title)" }}>Section title 16/bold</span></div>
                    <div><span style={{ font: "var(--dp-text-metric-hero)", color: "var(--dp-accent-hero)", fontVariantNumeric: "tabular-nums" }}>72.4</span> <small style={{ color: "var(--dp-ink-secondary)" }}>Record numeral 40/black, ink-green</small></div>
                    <div><span style={{ font: "var(--dp-text-metric)", fontVariantNumeric: "tabular-nums" }}>1,480</span> <small style={{ color: "var(--dp-ink-secondary)" }}>Secondary metric 22/bold</small></div>
                    <div><span style={{ font: "var(--dp-text-body)" }}>Body 15.5/regular — 오늘도 기록해주셔서 감사해요.</span></div>
                    <div><span style={{ font: "var(--dp-text-helper)", color: "var(--dp-text-muted)" }}>Helper 13 — 참고용 정보</span></div>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Radius &amp; Spacing</h2></div>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
                    {RADII.map(([varName, label]) => (
                        <div key={varName} style={{ textAlign: "center" }}>
                            <div style={{ width: 56, height: 56, background: "var(--color-primary-soft)", borderRadius: `var(${varName})`, border: "1px solid var(--dp-hairline-strong)" }} />
                            <div style={{ fontSize: 11.5, marginTop: 6, color: "var(--dp-ink-secondary)", maxWidth: 110 }}>{label}</div>
                        </div>
                    ))}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                    {SPACING.map((px) => (
                        <div key={px} style={{ textAlign: "center" }}>
                            <div style={{ width: 20, height: px, background: "var(--dp-accent-hero)", borderRadius: 2 }} />
                            <div style={{ fontSize: 10.5, marginTop: 4, color: "var(--dp-text-muted)" }}>{px}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Card — real grouping, not decoration</h2></div>
                <p className="dp-field-help" style={{ marginBottom: 12 }}>
                    v3's rule was "no cards anywhere," which removed structure along with the AI-slop look. v4's rule:
                    a card marks one genuine group of related data or actions (a "today" summary, a set of 4 quick
                    actions, a settings group) — never 8 identical repeated tiles, never decoration.
                </p>
                <div className="dp-card" style={{ maxWidth: 420 }}>
                    <p className="dp-card-title">오늘의 건강 상태</p>
                    <span className="dp-metric-label">현재 체중</span>
                    <div>
                        <span className="dp-record-value">72.4<small>kg</small></span>
                    </div>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Buttons</h2></div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="dp-btn dp-btn-primary">기록하기</button>
                    <button className="dp-btn dp-btn-secondary">자세히 보기</button>
                    <button className="dp-btn dp-btn-ghost">건너뛰기</button>
                    <button className="dp-btn dp-btn-primary" disabled>비활성</button>
                    <button className="dp-btn dp-btn-primary dp-btn-sm">작은 버튼</button>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Inputs / Select / Checkbox</h2></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 16, maxWidth: 640 }}>
                    <label className="dp-field">
                        <span className="dp-field-label">오늘 체중</span>
                        <input className="dp-input" defaultValue="72.4" inputMode="decimal" />
                        <span className="dp-field-reference"><span>추천 —</span><span>목표 68.0 kg</span></span>
                    </label>
                    <label className="dp-field">
                        <span className="dp-field-label">활동 수준</span>
                        <select className="dp-select" defaultValue="moderate">
                            <option value="low">낮음</option>
                            <option value="moderate">보통</option>
                            <option value="high">높음</option>
                        </select>
                    </label>
                    <label className="dp-check">
                        <input type="checkbox" defaultChecked /> 열량·단백질 목표에 맞춰 추천받기
                    </label>
                    <label className="dp-check">
                        <input type="radio" name="dp-demo-radio" defaultChecked /> 자동 계산
                    </label>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Quick actions — one primary, three quiet</h2></div>
                <p className="dp-field-help" style={{ marginBottom: 12 }}>
                    Not 4 identical bordered cards: the action logged most often gets real weight (filled, larger); the
                    rest stay flat and quiet. Reads as a native primary-plus-shortcuts bar, not a repeated tile grid.
                </p>
                <div className="dp-action-grid" style={{ maxWidth: 360 }}>
                    <button type="button" className="dp-action-tile dp-action-primary">
                        <span className="dp-action-icon"><IconScale /></span>
                        <span>{QUICK_ACTIONS[0].label} 기록</span>
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

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Health target — not a form field</h2></div>
                <p className="dp-field-help" style={{ marginBottom: 12 }}>
                    Spacing carries the sequence between groups — no numbered circles, no divider-per-step (that reads
                    as a wizard/settings form). A calorie/protein target renders at the same visual weight as a
                    Dashboard metric; Stevil's suggestion sits underneath as a quiet, skippable line.
                </p>
                <div className="dp-card" style={{ maxWidth: 420 }}>
                    <div className="dp-flow-step" style={{ paddingTop: 0 }}>
                        <span className="dp-metric-label">목표 열량</span>
                        <div className="dp-target">
                            <span className="dp-target-value">1,600</span>
                            <span className="dp-target-unit">kcal</span>
                        </div>
                        <div className="dp-target-suggestion">Stevil 추천 1,580kcal<button type="button">적용</button></div>
                    </div>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Tabs</h2></div>
                <div className="dp-tabs" style={{ maxWidth: 360 }}>
                    <span className="dp-tab dp-active">일간</span>
                    <span className="dp-tab">주간</span>
                    <span className="dp-tab">월간</span>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Bottom Navigation</h2></div>
                <div style={{ maxWidth: 420, border: "1px solid var(--dp-hairline)", borderRadius: "var(--dp-radius-md)", overflow: "hidden" }}>
                    <nav className="dp-bottomnav" style={{ position: "static" }}>
                        {NAV_ITEMS.map(({ key, label, Icon }, i) => (
                            <span key={key} className={`dp-bottomnav-item ${i === 0 ? "dp-active" : ""}`}>
                                <span className="dp-bottomnav-icon"><Icon /></span>
                                {label}
                            </span>
                        ))}
                    </nav>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Metric</h2></div>
                <div className="dp-metric-row" style={{ maxWidth: 480 }}>
                    <div className="dp-metric">
                        <span className="dp-metric-label">현재 체중</span>
                        <span className="dp-metric-value">72.4<small>kg</small></span>
                        <span className="dp-metric-delta dp-down">▼ 0.6kg</span>
                    </div>
                    <div className="dp-metric">
                        <span className="dp-metric-label">오늘 섭취 열량</span>
                        <span className="dp-metric-value">1,480<small>kcal</small></span>
                    </div>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Badge / Status</h2></div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    <span className="dp-badge">D-2 · 다음 투약</span>
                    <span className="dp-badge dp-badge-info">제휴 병원</span>
                    <span className="dp-badge dp-badge-warning">확인 필요</span>
                    <span className="dp-badge dp-badge-danger">기한 초과</span>
                    <span className="dp-badge dp-badge-second">투약 알림</span>
                    <span className="dp-badge dp-badge-neutral"><span className="dp-status-dot dp-ok" />정상</span>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Flat list row</h2></div>
                <div style={{ maxWidth: 420 }}>
                    <div className="dp-list-row">
                        <span className="dp-list-row-title" style={{ fontSize: 14.5 }}>목표 체중</span>
                        <span style={{ fontSize: 13.5, color: "var(--dp-ink-secondary)" }}>68.0 kg</span>
                    </div>
                    <hr className="dp-divider" style={{ margin: 0 }} />
                    <div className="dp-list-row">
                        <span className="dp-list-row-title" style={{ fontSize: 14.5 }}>알림</span>
                        <span style={{ fontSize: 13.5, color: "var(--dp-ink-secondary)" }}>켜짐</span>
                    </div>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">PWA 상태 — edge-to-edge bar, not a toast card</h2></div>
                <PwaBanners />
                <div className="dp-pwa-banner dp-sync">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 8a6 6 0 0 1 10.5-3.8M16 12a6 6 0 0 1-10.5 3.8" />
                        <path d="M14 2v3h-3M6 18v-3h3" />
                    </svg>
                    변경 사항 동기화 중…<button type="button">닫기</button>
                </div>
            </section>

            <section className="dp-section">
                <div className="dp-section-head"><h2 className="dp-section-title">Empty / Loading / Error</h2></div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                    <div className="dp-card-flat dp-state">
                        <span className="dp-state-mark" aria-hidden="true" />
                        <span className="dp-state-title">아직 기록이 없어요</span>
                        <span className="dp-state-desc">오늘의 체중을 기록해 보세요.</span>
                    </div>
                    <div className="dp-card-flat" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div className="dp-skeleton" style={{ height: 16, width: "60%" }} />
                        <div className="dp-skeleton" style={{ height: 32, width: "40%" }} />
                        <div className="dp-skeleton" style={{ height: 12, width: "80%" }} />
                    </div>
                    <div className="dp-card-flat dp-state">
                        <span className="dp-state-mark" style={{ background: "var(--color-danger)" }} aria-hidden="true" />
                        <span className="dp-state-title">불러오지 못했어요</span>
                        <span className="dp-state-desc">네트워크 상태를 확인하고 다시 시도해 주세요.</span>
                    </div>
                </div>
            </section>

            <section className="dp-section" style={{ borderBottom: "none" }}>
                <div className="dp-section-head"><h2 className="dp-section-title">Chart container</h2></div>
                <div className="dp-card-flat" style={{ maxWidth: 420 }}>
                    <div className="dp-chart">
                        {[40, 55, 48, 62, 58, 66, 72].map((h, i) => (
                            <div key={i} className={`dp-chart-bar ${i === 6 ? "dp-highlight" : ""}`} style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="dp-chart-labels">
                        {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => <span key={d} className={i === 6 ? "dp-highlight" : ""}>{d}</span>)}
                    </div>
                </div>
            </section>
        </div>
    );
}
