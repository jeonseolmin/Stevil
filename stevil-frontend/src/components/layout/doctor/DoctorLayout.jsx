import { useEffect, useState } from "react";
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import axiosInstance from "../../../api/axiosInstance";
import "./DoctorLayout.css";

const DOCTOR_MENU = [
    {
        path: "/doctor/dashboard",
        label: "대시보드",
        end: true,
    },
    {
        path: "/doctor/patients",
        label: "환자 관리",
    },
    {
        path: "/doctor/ads/apply",
        label: "광고·제휴 신청",
    },
];

export default function DoctorLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const verifyDoctor = async () => {
            try {
                // 의사 정보 조회 (기존 /users/me 활용)
                const response = await axiosInstance.get("/users/me");
                
                if (response.data.role !== "ROLE_DOCTOR" && response.data.role !== "ROLE_ADMIN") {
                    throw new Error("Unauthorized");
                }

                setDoctor(response.data);
            } catch (error) {
                const status = error.response?.status;

                if (status === 401) {
                    localStorage.removeItem("accessToken");
                    navigate("/login", { replace: true });
                    return;
                }

                navigate("/dashboard", {
                    replace: true,
                    state: {
                        errorMessage: "의사 권한만 접근할 수 있습니다.",
                    },
                });
            } finally {
                setLoading(false);
            }
        };

        verifyDoctor();
    }, [navigate]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userRole");

        navigate("/", {
            replace: true,
        });
    };

    if (loading) {
        return (
            <main className="doctor-auth-loading">
                <div className="doctor-loading-spinner" />
                <p>의사 권한을 확인하고 있습니다.</p>
            </main>
        );
    }

    if (!doctor) {
        return null;
    }

    return (
        <div className="doctor-layout">
            <aside
                className={
                    sidebarOpen
                        ? "doctor-sidebar doctor-sidebar--open"
                        : "doctor-sidebar"
                }
            >
                <header className="doctor-sidebar-header">
                    <button
                        type="button"
                        className="doctor-brand"
                        onClick={() => navigate("/doctor/dashboard")}
                    >
                        <span className="doctor-brand-mark">
                            S
                        </span>

                        <span>
                            <strong>Stevil</strong>
                            <small>의사</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        className="doctor-sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="의사 메뉴 닫기"
                    >
                        ×
                    </button>
                </header>

                <nav className="doctor-navigation">
                    {DOCTOR_MENU.map((menu) => (
                        <NavLink
                            key={menu.path}
                            to={menu.path}
                            end={menu.end}
                            className={({ isActive }) =>
                                isActive
                                    ? "doctor-nav-link doctor-nav-link--active"
                                    : "doctor-nav-link"
                            }
                        >
                            {menu.label}
                        </NavLink>
                    ))}
                </nav>

                <footer className="doctor-sidebar-footer">
                    <div className="doctor-profile">
                        <span className="doctor-profile-avatar">
                            {doctor.email
                                ?.charAt(0)
                                .toUpperCase()}
                        </span>

                        <span>
                            <strong>의사</strong>
                            <small>{doctor.email}</small>
                        </span>
                    </div>

                    <button
                        type="button"
                        className="doctor-logout-button"
                        onClick={handleLogout}
                    >
                        로그아웃
                    </button>
                </footer>
            </aside>

            {sidebarOpen && (
                <button
                    type="button"
                    className="doctor-sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="의사 메뉴 닫기"
                />
            )}

            <div className="doctor-main">
                <header className="doctor-topbar">
                    <button
                        type="button"
                        className="doctor-menu-button"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="의사 메뉴 열기"
                    >
                        ☰
                    </button>

                    <div>
                        <strong>Stevil 의사</strong>
                        <span>환자 및 제휴 관리</span>
                    </div>

                    <button
                        type="button"
                        className="doctor-user-site-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        사용자 화면
                    </button>
                </header>

                <main className="doctor-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}