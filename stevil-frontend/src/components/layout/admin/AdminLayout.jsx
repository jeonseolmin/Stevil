import { useEffect, useState } from "react";
import {
    NavLink,
    Outlet,
    useLocation,
    useNavigate,
} from "react-router-dom";

import axiosInstance from "../../../api/axiosInstance";
import "./AdminLayout.css";

const ADMIN_MENU = [
    {
        path: "/admin",
        label: "대시보드",
        end: true,
    },
    {
        path: "/admin/users",
        label: "회원 관리",
    },
    {
        path: "/admin/facilities",
        label: "병원·약국",
    },
    {
        path: "/admin/reports",
        label: "신고 관리",
    },
    {
        path: "/admin/inquiries",
        label: "문의 관리",
    },
    {
        path: "/admin/contents",
        label: "건강 콘텐츠",
    },
];

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const verifyAdmin = async () => {
            try {
                const response =
                    await axiosInstance.get("/admin/me");

                setAdmin(response.data);
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
                        errorMessage:
                            "관리자만 접근할 수 있습니다.",
                    },
                });
            } finally {
                setLoading(false);
            }
        };

        verifyAdmin();
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
            <main className="admin-auth-loading">
                <div className="admin-loading-spinner" />
                <p>관리자 권한을 확인하고 있습니다.</p>
            </main>
        );
    }

    if (!admin) {
        return null;
    }

    return (
        <div className="admin-layout">
            <aside
                className={
                    sidebarOpen
                        ? "admin-sidebar admin-sidebar--open"
                        : "admin-sidebar"
                }
            >
                <header className="admin-sidebar-header">
                    <button
                        type="button"
                        className="admin-brand"
                        onClick={() => navigate("/admin")}
                    >
                        <span className="admin-brand-mark">
                            S
                        </span>

                        <span>
                            <strong>Stevil</strong>
                            <small>ADMIN</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        className="admin-sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="관리자 메뉴 닫기"
                    >
                        ×
                    </button>
                </header>

                <nav className="admin-navigation">
                    {ADMIN_MENU.map((menu) => (
                        <NavLink
                            key={menu.path}
                            to={menu.path}
                            end={menu.end}
                            className={({ isActive }) =>
                                isActive
                                    ? "admin-nav-link admin-nav-link--active"
                                    : "admin-nav-link"
                            }
                        >
                            {menu.label}
                        </NavLink>
                    ))}
                </nav>

                <footer className="admin-sidebar-footer">
                    <div className="admin-profile">
                        <span className="admin-profile-avatar">
                            {admin.email
                                ?.charAt(0)
                                .toUpperCase()}
                        </span>

                        <span>
                            <strong>관리자</strong>
                            <small>{admin.email}</small>
                        </span>
                    </div>

                    <button
                        type="button"
                        className="admin-logout-button"
                        onClick={handleLogout}
                    >
                        로그아웃
                    </button>
                </footer>
            </aside>

            {sidebarOpen && (
                <button
                    type="button"
                    className="admin-sidebar-backdrop"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="관리자 메뉴 닫기"
                />
            )}

            <div className="admin-main">
                <header className="admin-topbar">
                    <button
                        type="button"
                        className="admin-menu-button"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="관리자 메뉴 열기"
                    >
                        ☰
                    </button>

                    <div>
                        <strong>Stevil 관리자</strong>
                        <span>서비스 운영 관리</span>
                    </div>

                    <button
                        type="button"
                        className="admin-user-site-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        사용자 화면
                    </button>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}