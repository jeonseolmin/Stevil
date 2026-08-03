import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Header.css";
import ThemeToggle from "./ThemeToggle.jsx";

const sidebarSections = [
    {
        title: null,
        menus: [
            { to: "/", icon: "⌂", label: "홈" },
            { to: "/planner", icon: "✦", label: "AI 여행 만들기" },
            { to: "/explore", icon: "⌖", label: "여행지 탐색" },
            { to: "/my-trips", icon: "▣", label: "내 여행" },
        ],
    },
    {
        title: "여행 관리",
        menus: [
            { to: "/tools/budget", icon: "₩", label: "여행 경비" },
            { to: "/tools/checklist", icon: "✓", label: "체크리스트" },
            { to: "/mypage/bookmarks", icon: "♡", label: "즐겨찾기" },
        ],
    },
    {
        title: "여행 정보",
        menus: [
            { to: "/tools/exchange", icon: "↔", label: "환율" },
            { to: "/tools/weather", icon: "☀", label: "날씨" },
            { to: "/community", icon: "◇", label: "커뮤니티" },
        ],
    },
    {
        title: "계정",
        menus: [
            { to: "/notifications", icon: "♢", label: "알림" },
            { to: "/mypage/profile", icon: "○", label: "마이페이지" },
            { to: "/login", icon: "→", label: "로그인" },
        ],
    },
];

export default function Header() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeSidebar();
            }
        };

        if (isSidebarOpen) {
            document.body.classList.add("sidebar-open");
            window.addEventListener("keydown", handleKeyDown);
        }

        return () => {
            document.body.classList.remove("sidebar-open");
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isSidebarOpen]);

    return (
        <>
            <header className="header">
                <div className="header-start">
                    <button
                        type="button"
                        className="hamburger-button"
                        aria-label="전체 메뉴 열기"
                        aria-expanded={isSidebarOpen}
                        aria-controls="main-sidebar"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>

                    <NavLink className="header-logo" to="/">
                        PLUG·TRIP
                    </NavLink>
                </div>

                <nav className="header-nav" aria-label="주요 메뉴">
                    <NavLink to="/planner">AI 여행 만들기</NavLink>
                    <NavLink to="/explore">여행지 탐색</NavLink>
                </nav>

                <div className="header-account">
                    <ThemeToggle />

                    <NavLink className="login-link" to="/login">
                        로그인
                    </NavLink>

                    <NavLink className="signup-link" to="/signup">
                        회원가입
                    </NavLink>
                </div>
            </header>

            <div
                className={`sidebar-overlay ${
                    isSidebarOpen ? "sidebar-overlay--visible" : ""
                }`}
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <aside
                id="main-sidebar"
                className={`sidebar ${
                    isSidebarOpen ? "sidebar--open" : ""
                }`}
                aria-label="전체 메뉴"
                aria-hidden={!isSidebarOpen}
            >
                <div className="sidebar-header">
                    <NavLink
                        className="sidebar-logo"
                        to="/"
                        onClick={closeSidebar}
                    >
                        PLUG·TRIP
                    </NavLink>

                    <button
                        type="button"
                        className="sidebar-close-button"
                        aria-label="전체 메뉴 닫기"
                        onClick={closeSidebar}
                    >
                        ×
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {sidebarSections.map((section, sectionIndex) => (
                        <section
                            className="sidebar-section"
                            key={section.title ?? sectionIndex}
                        >
                            {section.title && (
                                <h2 className="sidebar-section-title">
                                    {section.title}
                                </h2>
                            )}

                            <div className="sidebar-menu-list">
                                {section.menus.map((menu) => (
                                    <NavLink
                                        key={menu.to}
                                        to={menu.to}
                                        end={menu.to === "/"}
                                        onClick={closeSidebar}
                                        className={({ isActive }) =>
                                            `sidebar-menu-item ${
                                                isActive
                                                    ? "sidebar-menu-item--active"
                                                    : ""
                                            }`
                                        }
                                    >
                                        <span
                                            className="sidebar-menu-icon"
                                            aria-hidden="true"
                                        >
                                            {menu.icon}
                                        </span>

                                        <span>{menu.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </section>
                    ))}
                </nav>
            </aside>
        </>
    );
}