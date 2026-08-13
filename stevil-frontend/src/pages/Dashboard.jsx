import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

import axiosInstance from "../api/axiosInstance";
import "./Dashboard.css";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

function formatWeight(value) {
    if (value === null || value === undefined) {
        return "-";
    }

    return Number(value).toFixed(1);
}

function formatDate(dateTime) {
    if (!dateTime) {
        return "";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
    }).format(new Date(dateTime));
}

export default function Dashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setIsLoading(true);
                setError("");

                const response = await axiosInstance.get("/dashboard");

                setDashboard(response.data);
            } catch (requestError) {
                const status = requestError.response?.status;

                console.error(
                    "대시보드 조회 실패:",
                    status,
                    requestError.response?.data
                );

                if (status === 401 || status === 403) {
                    localStorage.removeItem("accessToken");

                    navigate("/login", {
                        replace: true,
                    });

                    return;
                }

                if (status === 409) {
                    navigate("/onboarding", {
                        replace: true,
                    });

                    return;
                }

                setError(
                    requestError.response?.data?.message ||
                    "대시보드 정보를 불러오지 못했습니다."
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboard();
    }, [navigate]);

    const chartData = useMemo(() => {
        const recentWeights = dashboard?.recentWeights ?? [];

        return {
            labels: recentWeights.map((record) =>
                formatDate(record.recordedAt)
            ),
            datasets: [
                {
                    label: "체중",
                    data: recentWeights.map((record) =>
                        Number(record.weightKg)
                    ),
                    borderColor: "#20bfa9",
                    backgroundColor: "rgba(32, 191, 169, 0.12)",
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#20bfa9",
                    pointBorderWidth: 3,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                },
            ],
        };
    }, [dashboard]);

    const chartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index",
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: (context) =>
                            ` ${Number(context.raw).toFixed(1)}kg`,
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        display: false,
                    },
                    border: {
                        display: false,
                    },
                    ticks: {
                        color: "#7d918e",
                    },
                },
                y: {
                    grace: "10%",
                    border: {
                        display: false,
                    },
                    grid: {
                        color: "rgba(220, 233, 230, 0.7)",
                    },
                    ticks: {
                        color: "#7d918e",
                        callback: (value) => `${value}kg`,
                    },
                },
            },
        }),
        []
    );

    if (isLoading) {
        return (
            <div className="dashboard-state">
                <div
                    className="dashboard-spinner"
                    aria-hidden="true"
                />
                <p>건강 기록을 불러오고 있습니다.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-state dashboard-state--error">
                <h1>대시보드를 불러오지 못했습니다</h1>
                <p>{error}</p>

                <button
                    type="button"
                    onClick={() => window.location.reload()}
                >
                    다시 시도
                </button>
            </div>
        );
    }

    if (!dashboard) {
        return null;
    }

    const progressRate = Math.min(
        100,
        Math.max(0, Number(dashboard.progressRate ?? 0))
    );

    const displayName =
        dashboard.nickname?.trim() || "사용자";

    const hasEnoughChartData =
        dashboard.recentWeights?.length >= 2;

    return (
        <div className="dashboard-page">
            <div className="dashboard-container">
                <section className="dashboard-welcome">
                    <div>
                        <span className="dashboard-eyebrow">
                            TODAY
                        </span>

                        <h1>
                            {displayName}님,
                            <br />
                            오늘도 건강한 하루 보내세요.
                        </h1>

                        <p>
                            작은 기록이 건강한 변화를 만듭니다.
                        </p>
                    </div>

                    {dashboard.profileImage ? (
                        <img
                            src={dashboard.profileImage}
                            alt={`${displayName}님의 프로필`}
                            className="dashboard-profile-image"
                        />
                    ) : (
                        <div
                            className="dashboard-profile-placeholder"
                            aria-hidden="true"
                        >
                            {displayName.charAt(0)}
                        </div>
                    )}
                </section>

                <section
                    className="dashboard-weight-summary"
                    aria-labelledby="weight-summary-title"
                >
                    <div className="dashboard-section-heading">
                        <div>
                            <span>체중 관리</span>
                            <h2 id="weight-summary-title">
                                목표를 향한 진행 상황
                            </h2>
                        </div>

                        <button
                            type="button"
                            className="dashboard-text-button"
                            onClick={() =>
                                navigate("/weight")
                            }
                        >
                            체중 기록하기
                        </button>
                    </div>

                    <div className="weight-card-grid">
                        <article className="weight-card weight-card--primary">
                            <span>현재 체중</span>

                            <strong>
                                {formatWeight(
                                    dashboard.currentWeightKg
                                )}
                                <small>kg</small>
                            </strong>

                            <p>
                                시작 체중{" "}
                                {formatWeight(
                                    dashboard.startWeightKg
                                )}
                                kg
                            </p>
                        </article>

                        <article className="weight-card">
                            <span>감량한 체중</span>

                            <strong>
                                {formatWeight(
                                    dashboard.lostWeightKg
                                )}
                                <small>kg</small>
                            </strong>

                            <p>지금까지의 변화입니다.</p>
                        </article>

                        <article className="weight-card">
                            <span>목표까지</span>

                            <strong>
                                {formatWeight(
                                    dashboard.remainingWeightKg
                                )}
                                <small>kg</small>
                            </strong>

                            <p>
                                목표 체중{" "}
                                {formatWeight(
                                    dashboard.targetWeightKg
                                )}
                                kg
                            </p>
                        </article>
                    </div>

                    <div className="dashboard-progress-card">
                        <div className="dashboard-progress-info">
                            <span>전체 감량 진행률</span>
                            <strong>
                                {progressRate.toFixed(1)}%
                            </strong>
                        </div>

                        <div
                            className="dashboard-progress-track"
                            role="progressbar"
                            aria-label="체중 감량 진행률"
                            aria-valuemin="0"
                            aria-valuemax="100"
                            aria-valuenow={progressRate}
                        >
                            <span
                                style={{
                                    width: `${progressRate}%`,
                                }}
                            />
                        </div>
                    </div>
                </section>

                <section className="dashboard-content-grid">
                    <article className="dashboard-panel dashboard-chart-panel">
                        <div className="dashboard-section-heading">
                            <div>
                                <span>최근 기록</span>
                                <h2>체중 변화</h2>
                            </div>
                        </div>

                        {hasEnoughChartData ? (
                            <div className="dashboard-chart">
                                <Line
                                    data={chartData}
                                    options={chartOptions}
                                />
                            </div>
                        ) : (
                            <div className="dashboard-empty-chart">
                                <strong>
                                    체중 기록을 시작해 보세요
                                </strong>

                                <p>
                                    체중을 두 번 이상 기록하면 변화
                                    그래프가 표시됩니다.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate("/weight")
                                    }
                                >
                                    체중 기록하기
                                </button>
                            </div>
                        )}
                    </article>

                    <article className="dashboard-panel">
                        <div className="dashboard-section-heading">
                            <div>
                                <span>빠른 기록</span>
                                <h2>오늘의 건강 기록</h2>
                            </div>
                        </div>

                        <div className="quick-action-list">
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/weight")
                                }
                            >
                                <span className="quick-action-icon">
                                    W
                                </span>

                                <span>
                                    <strong>체중</strong>
                                    <small>
                                        오늘의 체중 기록
                                    </small>
                                </span>

                                <b aria-hidden="true">›</b>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/diet")
                                }
                            >
                                <span className="quick-action-icon">
                                    D
                                </span>

                                <span>
                                    <strong>식단</strong>
                                    <small>
                                        섭취한 음식 기록
                                    </small>
                                </span>

                                <b aria-hidden="true">›</b>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/exercise")
                                }
                            >
                                <span className="quick-action-icon">
                                    E
                                </span>

                                <span>
                                    <strong>운동</strong>
                                    <small>
                                        오늘의 활동 기록
                                    </small>
                                </span>

                                <b aria-hidden="true">›</b>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/diary")
                                }
                            >
                                <span className="quick-action-icon">
                                    S
                                </span>

                                <span>
                                    <strong>증상</strong>
                                    <small>
                                        몸 상태와 증상 기록
                                    </small>
                                </span>

                                <b aria-hidden="true">›</b>
                            </button>
                        </div>
                    </article>
                </section>

                <section className="dashboard-daily-section">
                    <div className="dashboard-section-heading">
                        <div>
                            <span>오늘의 기록</span>
                            <h2>아직 기록하지 않은 항목</h2>
                        </div>
                    </div>

                    <div className="daily-card-grid">
                        <article className="daily-card">
                            <span className="daily-card-status">
                                기록 전
                            </span>
                            <h3>식단</h3>
                            <p>
                                오늘 먹은 음식과 영양 정보를
                                기록해 보세요.
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/diet")
                                }
                            >
                                식단 기록
                            </button>
                        </article>

                        <article className="daily-card">
                            <span className="daily-card-status">
                                기록 전
                            </span>
                            <h3>운동</h3>
                            <p>
                                운동 종류와 시간을 기록해 보세요.
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/exercise")
                                }
                            >
                                운동 기록
                            </button>
                        </article>

                        <article className="daily-card">
                            <span className="daily-card-status">
                                기록 전
                            </span>
                            <h3>증상</h3>
                            <p>
                                불편했던 증상이나 몸 상태를
                                남겨 보세요.
                            </p>
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/diary")
                                }
                            >
                                증상 기록
                            </button>
                        </article>
                    </div>
                </section>

                <aside className="dashboard-medical-notice">
                    <strong>건강 정보 안내</strong>

                    <p>
                        Stevil의 기록과 분석은 건강 관리를 돕기
                        위한 참고 정보이며 의료진의 진단이나 처방을
                        대신하지 않습니다.
                    </p>
                </aside>
            </div>
        </div>
    );
}