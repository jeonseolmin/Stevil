import Shell from "../components/Shell.jsx";
import { IconSearch, IconPin, IconHospital } from "../components/Icons.jsx";

const PLACES = [
    { name: "청담 웰니스의원", type: "병원", partner: true, distance: "320m", status: "진료중", statusTone: "ok", note: "위고비 처방 가능 · 예약 필요" },
    { name: "강남 하트 클리닉", type: "병원", partner: true, distance: "540m", status: "진료중", statusTone: "ok", note: "비만 클리닉 전문" },
    { name: "온누리약국 역삼점", type: "약국", partner: false, distance: "610m", status: "진료중", statusTone: "ok", note: "재고 확인 필요" },
    { name: "선릉 정형외과", type: "병원", partner: false, distance: "780m", status: "진료 종료", statusTone: "muted", note: "내일 09:00 오픈" },
];

export default function Hospital() {
    return (
        <Shell activeKey="hospital">
            <div className="dp-page-header">
                <span className="dp-page-context"><IconPin />내 주변 병원·약국</span>
                <h1 className="dp-page-heading">병원 찾기</h1>
            </div>

            <div style={{ position: "relative", marginBottom: 12 }}>
                <IconSearch style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--dp-text-muted)" }} />
                <input className="dp-input" style={{ paddingLeft: 40 }} placeholder="병원, 약국, 지역으로 검색" />
            </div>

            <div className="dp-tabs" style={{ marginBottom: "var(--dp-space-4)" }}>
                <span className="dp-tab dp-active">전체</span>
                <span className="dp-tab">병원</span>
                <span className="dp-tab">약국</span>
            </div>

            {/* ================================================= */}
            {/* Mobile: map first, a preview strip docked right      */}
            {/* under it (zero gap, same radius language), then the  */}
            {/* full list — map and results read as one interaction. */}
            {/* Desktop: classic split-pane, list left / map sticky   */}
            {/* right (see .dp-hospital-layout / order in CSS).       */}
            {/* ================================================= */}
            <div className="dp-hospital-layout">
                <div className="dp-map-panel">
                    {/* Placeholder only; real map keeps its existing
                        production implementation (Naver Maps, search,
                        partner/ad markers) and drops in here. Dot-grid +
                        scattered pins read as "a map" even as a static
                        mock — a flat tinted box does not. */}
                    <div
                        className="dp-hero dp-map-placeholder"
                        style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            gap: 6, color: "var(--dp-text-muted)", fontSize: 13,
                            border: "1px solid var(--dp-hairline)", textAlign: "center", padding: 24,
                        }}
                    >
                        <span className="dp-map-pin" style={{ top: "22%", left: "28%" }} aria-hidden="true"><IconPin /></span>
                        <span className="dp-map-pin" style={{ top: "34%", left: "68%" }} aria-hidden="true"><IconPin /></span>
                        <span className="dp-map-pin" style={{ top: "66%", left: "40%" }} aria-hidden="true"><IconPin /></span>
                        <span className="dp-map-pin" style={{ top: "72%", left: "74%" }} aria-hidden="true"><IconPin /></span>
                        <IconPin style={{ width: 26, height: 26, color: "var(--dp-accent-hero)", position: "relative", zIndex: 1 }} />
                        <span className="dp-map-caption">지도 영역 (실제 지도는 기존 HospitalMapPage 연동)</span>
                    </div>
                    <button type="button" className="dp-locate-btn" aria-label="현재 위치로 이동">
                        <IconPin />
                    </button>
                </div>

                <div className="dp-hospital-results">
                    <div className="dp-hospital-carousel">
                        {PLACES.map((place) => (
                            <div key={place.name} className="dp-carousel-card">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                    <span className="dp-carousel-card-title">{place.name}</span>
                                    {place.partner && <span className="dp-badge dp-badge-info" style={{ flexShrink: 0 }}>제휴</span>}
                                </div>
                                <div className="dp-carousel-card-meta">{place.distance} · {place.status}</div>
                            </div>
                        ))}
                    </div>

                    <div className="dp-section-head" style={{ marginTop: "var(--dp-space-4)" }}>
                        <h2 className="dp-section-title">검색 결과 4곳</h2>
                        <select className="dp-select dp-select-inline" defaultValue="distance">
                            <option value="distance">거리순</option>
                            <option value="rating">평점순</option>
                        </select>
                    </div>

                    <div>
                        {PLACES.map((place, i) => (
                            <div key={place.name}>
                                <div className="dp-result-item">
                                    <span className="dp-result-icon"><IconHospital /></span>
                                    <div className="dp-result-body">
                                        <div className="dp-result-top">
                                            <span className="dp-result-name">{place.name}</span>
                                            {place.partner && <span className="dp-badge dp-badge-info">제휴</span>}
                                        </div>
                                        <div className="dp-result-meta">{place.type} · {place.distance} · {place.note}</div>
                                    </div>
                                    <span className={`dp-result-status ${place.statusTone === "ok" ? "dp-ok" : ""}`}>
                                        <span className={`dp-status-dot dp-${place.statusTone === "ok" ? "ok" : "muted"}`} />
                                        {place.status}
                                    </span>
                                </div>
                                {i < PLACES.length - 1 && <hr className="dp-divider" style={{ margin: 0 }} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <section className="dp-section" style={{ borderBottom: "none", marginTop: "var(--dp-space-6)" }}>
                <div className="dp-section-head"><h2 className="dp-section-title">제휴 안내</h2></div>
                <p className="dp-page-sub" style={{ marginBottom: 10 }}>
                    병원·약국 담당자이신가요? Stevil 제휴로 등록하고 이용자에게 노출해 보세요.
                </p>
                <button type="button" className="dp-btn dp-btn-secondary">제휴 안내 보기</button>
            </section>
        </Shell>
    );
}
