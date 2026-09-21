import { useState } from "react";
import Shell from "../components/Shell.jsx";
import { IconChevron, IconScale, IconExercise, IconHospital, IconProfile } from "../components/Icons.jsx";

const HEALTH_PROFILE = [
    ["목표 체중", "68.0 kg", IconScale],
    ["활동 수준", "보통", IconExercise],
    ["연동 병원", "청담 웰니스의원", IconHospital],
];

// Avatar ring: same start→goal progress as the 진행 상태 card below,
// so the identity header itself carries the journey at a glance.
const RING_R = 27;
const RING_CIRC = 2 * Math.PI * RING_R;
const RING_PROGRESS = 0.56;

const APP_SETTINGS = [
    ["알림", "투약 · 식단 리마인더 켜짐"],
    ["앱 버전", "1.4.2 · 최신"],
];

const COMMUNITY_POSTS = [
    { title: "위고비 2주차 부작용 공유해요", meta: "댓글 12 · 좋아요 34", time: "3시간 전" },
    { title: "식단 기록 꿀팁 정리했어요", meta: "댓글 8 · 좋아요 21", time: "어제" },
    { title: "오늘 병원 다녀온 후기", meta: "댓글 3 · 좋아요 9", time: "2일 전" },
];

export default function MyPage() {
    const [tab, setTab] = useState("info");

    return (
        <Shell activeKey="my">
            <div className="dp-page-header">
                <span className="dp-page-context"><IconProfile />계정 · 설정</span>
                <h1 className="dp-page-heading">마이페이지</h1>

                <div className="dp-page-header-identity">
                    <div className="dp-avatar-ring">
                        <svg viewBox="0 0 60 60" aria-hidden="true">
                            <circle cx="30" cy="30" r={RING_R} fill="none" stroke="var(--dp-hairline-strong)" strokeWidth="3" />
                            <circle
                                cx="30" cy="30" r={RING_R} fill="none" stroke="var(--dp-accent-hero)" strokeWidth="3"
                                strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC * (1 - RING_PROGRESS)}
                            />
                        </svg>
                        <div className="dp-avatar-ring-photo" role="img" aria-label="목표까지 56% 진행">세</div>
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>세민님</div>
                        <div style={{ fontSize: 12.5, color: "var(--dp-text-muted)" }}>junseolmin91@gmail.com</div>
                    </div>
                </div>
            </div>

            <div className="dp-tabs dp-tabs-underline" style={{ marginBottom: 8 }}>
                {[
                    ["info", "내 정보"],
                    ["community", "커뮤니티"],
                    ["settings", "설정"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        className={`dp-tab ${tab === key ? "dp-active" : ""}`}
                        style={{ border: "none", background: "none", cursor: "pointer" }}
                        onClick={() => setTab(key)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === "info" && (
                <>
                    <section className="dp-section">
                        <div className="dp-card">
                            <p className="dp-card-title">진행 상태</p>
                            <div className="dp-metric-row" style={{ maxWidth: 480 }}>
                                <div className="dp-metric">
                                    <span className="dp-metric-label">시작 체중</span>
                                    <span className="dp-metric-value">78.0<small>kg</small></span>
                                </div>
                                <div className="dp-metric">
                                    <span className="dp-metric-label">현재 체중</span>
                                    <span className="dp-metric-value">72.4<small>kg</small></span>
                                </div>
                                <div className="dp-metric">
                                    <span className="dp-metric-label">감량</span>
                                    <span className="dp-metric-value">5.6<small>kg</small></span>
                                    <span className="dp-metric-delta dp-down">목표까지 4.4kg</span>
                                </div>
                            </div>

                            <div style={{ marginTop: "var(--dp-space-5)" }}>
                                <div className="dp-progress-track" role="img" aria-label="목표까지 56% 진행, 시작 78.0kg에서 현재 72.4kg, 목표 68.0kg">
                                    <div className="dp-progress-fill" style={{ width: "56%" }} />
                                </div>
                                <div className="dp-progress-labels" aria-hidden="true">
                                    <span>시작 78.0kg</span>
                                    <span>목표 68.0kg</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="dp-section" style={{ borderBottom: "none" }}>
                        <span className="dp-eyebrow">건강 프로필</span>
                        <div>
                            {HEALTH_PROFILE.map(([label, value, Icon], i) => (
                                <div key={label}>
                                    <div className="dp-list-row" style={{ justifyContent: "flex-start" }}>
                                        <span className="dp-list-row-icon"><Icon /></span>
                                        <span style={{ fontSize: 14.5, flex: 1 }}>{label}</span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--dp-ink-secondary)" }}>
                                            {value}
                                            <IconChevron style={{ color: "var(--dp-text-muted)" }} />
                                        </span>
                                    </div>
                                    {i < HEALTH_PROFILE.length - 1 && <hr className="dp-divider" style={{ margin: 0 }} />}
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            )}

            {tab === "community" && (
                <section className="dp-section">
                    <div className="dp-section-head">
                        <h2 className="dp-section-title">내가 쓴 글</h2>
                        <a href="/design-preview/my" className="dp-section-link" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>커뮤니티로<IconChevron style={{ width: 14, height: 14 }} /></a>
                    </div>
                    <div>
                        {COMMUNITY_POSTS.map((post, i) => (
                            <div key={post.title}>
                                <div className="dp-list-row" style={{ justifyContent: "flex-start" }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="dp-list-row-title" style={{ fontSize: 14.5 }}>{post.title}</div>
                                        <div className="dp-list-row-meta">{post.meta} · {post.time}</div>
                                    </div>
                                    <IconChevron style={{ color: "var(--dp-text-muted)", flexShrink: 0 }} />
                                </div>
                                {i < COMMUNITY_POSTS.length - 1 && <hr className="dp-divider" style={{ margin: 0 }} />}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {tab === "settings" && (
                <>
                    <section className="dp-section">
                        <span className="dp-eyebrow">앱 · PWA</span>
                        <div>
                            {APP_SETTINGS.map(([label, value], i) => (
                                <div key={label}>
                                    <div className="dp-list-row">
                                        <span style={{ fontSize: 14.5 }}>{label}</span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "var(--dp-ink-secondary)" }}>
                                            {value}
                                            <IconChevron style={{ color: "var(--dp-text-muted)" }} />
                                        </span>
                                    </div>
                                    {i < APP_SETTINGS.length - 1 && <hr className="dp-divider" style={{ margin: 0 }} />}
                                </div>
                            ))}
                        </div>
                    </section>
                    <section className="dp-section" style={{ borderBottom: "none" }}>
                        <span className="dp-eyebrow">계정</span>
                        <button type="button" className="dp-btn dp-btn-ghost" style={{ color: "var(--color-danger)", padding: "0 12px" }}>로그아웃</button>
                    </section>
                </>
            )}
        </Shell>
    );
}
