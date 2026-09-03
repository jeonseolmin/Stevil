
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import axiosInstance from "../../../api/axiosInstance.js";
import "./AdminDashboardPage.css";

const INITIAL_STATS = {
    totalUsers: 0,
    newUsersToday: 0,
    completedOnboardingUsers: 0,
    adminUsers: 0,
    totalInjectionLogs: 0,
    totalExerciseLogs: 0,
};

export default function AdminDashboardPage() {
    const navigate = useNavigate();

    const [stats, setStats] = useState(INITIAL_STATS);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const response =
                    await axiosInstance.get(
                        "/admin/dashboard"
                    );

                setStats(response.data);
            } catch (error) {
                setErrorMessage(
                    error.response?.data?.message
                    ?? "관리자 통계를 불러오지 못했습니다."
                );
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);

    const cards = [
        {
            label: "전체 회원",
            value: stats.totalUsers,
            description: "현재 가입된 전체 회원",
            path: "/admin/users",
        },
        {
            label: "오늘 가입",
            value: stats.newUsersToday,
            description: "오늘 새롭게 가입한 회원",
            path: "/admin/users",
        },
        {
            label: "온보딩 완료",
            value: stats.completedOnboardingUsers,
            description: "기본정보 등록을 완료한 회원",
            path: "/admin/users",
        },
        {
            label: "투약 기록",
            value: stats.totalInjectionLogs,
            description: "사용자가 작성한 전체 투약 기록",
        },
        {
            label: "운동 기록",
            value: stats.totalExerciseLogs,
            description: "사용자가 작성한 전체 운동 기록",
        },
        {
            label: "관리자",
            value: stats.adminUsers,
            description: "관리자 권한을 가진 계정",
            path: "/admin/users",
        },
    ];

    return (
        <section className="admin-dashboard-page">
            <header className="admin-dashboard-heading">
                <div>
                    <span>OVERVIEW</span>
                    <h1>관리자 대시보드</h1>
                    <p>
                        Stevil 서비스의 주요 현황을 확인합니다.
                    </p>
                </div>

                {stats.generatedAt && (
                    <small>
                        갱신:{" "}
                        {new Date(
                            stats.generatedAt
                        ).toLocaleString("ko-KR")}
                    </small>
                )}
            </header>

            {errorMessage && (
                <div className="admin-dashboard-error">
                    {errorMessage}
                </div>
            )}

            <div className="admin-dashboard-grid">
                {cards.map((card) => (
                    <button
                        type="button"
                        key={card.label}
                        className="admin-stat-card"
                        onClick={() => {
                            if (card.path) {
                                navigate(card.path);
                            }
                        }}
                        disabled={!card.path}
                    >
                        <span>{card.label}</span>

                        <strong>
                            {loading
                                ? "-"
                                : card.value.toLocaleString()}
                        </strong>

                        <small>{card.description}</small>
                    </button>
                ))}
            </div>

            <section className="admin-quick-section">
                <div className="admin-section-title">
                    <div>
                        <h2>빠른 관리</h2>
                        <p>
                            자주 사용하는 관리자 메뉴입니다.
                        </p>
                    </div>
                </div>

                <div className="admin-quick-grid">
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/admin/reports")
                        }
                    >
                        <strong>신고 관리</strong>
                        <span>
                            신고된 게시글과 댓글을 검토합니다.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/admin/inquiries")
                        }
                    >
                        <strong>문의 관리</strong>
                        <span>
                            사용자 문의를 확인하고 답변합니다.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/admin/facilities")
                        }
                    >
                        <strong>병원·약국 관리</strong>
                        <span>
                            시설 등록과 승인 상태를 관리합니다.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/admin/ads")
                        }
                    >
                        <strong>광고·제휴 관리</strong>
                        <span>
                            병원 상단 노출 및 제휴 신청을 승인/반려합니다.
                        </span>
                    </button>
                </div>
            </section>
        </section>
    );
}