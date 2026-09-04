import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DoctorDashboardPage.css";

export default function DoctorDashboardPage() {
    const navigate = useNavigate();
    
    // 백엔드 API 연동 전 임시 통계 데이터
    const [stats] = useState({
        totalPatients: 12,
        pendingReports: 3,
        activeAds: 1,
    });

    const cards = [
        {
            label: "내 환자 수",
            value: stats.totalPatients,
            description: "개인정보 제공에 동의한 환자",
            path: "/doctor/patients",
        },
        {
            label: "미확인 리포트",
            value: stats.pendingReports,
            description: "확인이 필요한 AI 요약본",
            path: "/doctor/patients",
        },
        {
            label: "진행 중인 광고",
            value: stats.activeAds,
            description: "현재 노출 중인 제휴 광고",
            path: "/doctor/ads/apply",
        },
    ];

    return (
        <section className="doctor-dashboard-page">
            <header className="doctor-dashboard-heading">
                <div>
                    <span>OVERVIEW</span>
                    <h1>의사 대시보드</h1>
                    <p>담당 환자의 건강 리포트를 확인하고 제휴 서비스를 관리합니다.</p>
                </div>
            </header>

            <div className="doctor-dashboard-grid">
                {cards.map((card) => (
                    <button
                        type="button"
                        key={card.label}
                        className="doctor-stat-card"
                        onClick={() => {
                            if (card.path) {
                                navigate(card.path);
                            }
                        }}
                    >
                        <span>{card.label}</span>
                        <strong>{card.value.toLocaleString()}</strong>
                        <small>{card.description}</small>
                    </button>
                ))}
            </div>

            <section className="doctor-quick-section">
                <div className="doctor-section-title">
                    <div>
                        <h2>빠른 관리</h2>
                        <p>자주 사용하는 의사 메뉴입니다.</p>
                    </div>
                </div>

                <div className="doctor-quick-grid">
                    <button
                        type="button"
                        onClick={() => navigate("/doctor/patients")}
                    >
                        <strong>환자 리포트 확인</strong>
                        <span>
                            환자들이 보낸 AI 요약본을 읽고 피드백을 남깁니다.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/doctor/ads/apply")}
                    >
                        <strong>광고·제휴 신청</strong>
                        <span>
                            플랫폼 상단 노출 및 광고를 신청합니다.
                        </span>
                    </button>
                </div>
            </section>
        </section>
    );
}