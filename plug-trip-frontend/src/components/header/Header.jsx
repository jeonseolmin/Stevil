import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Header.css";

export default function Header() {
    const [isToolsOpen, setIsToolsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // 로그인 기능 구현 후 실제 인증 상태로 교체
    const isLoggedIn = false;

    const closeMenus = () => {
        setIsToolsOpen(false);
        setIsProfileOpen(false);
    };

    return (
        <header className="header">
            <NavLink
                className="header-logo"
                to="/"
                onClick={closeMenus}
            >
                PLUG·TRIP
            </NavLink>

            <nav className="header-nav" aria-label="주요 메뉴">
                <NavLink to="/planner">
                    AI 여행 만들기
                </NavLink>

                <NavLink to="/explore">
                    여행지 탐색
                </NavLink>

                <NavLink to="/my-trips">
                    내 여행
                </NavLink>

                <NavLink to="/community">
                    커뮤니티
                </NavLink>

                <div className="header-dropdown">
                    <button
                        type="button"
                        className="header-dropdown-button"
                        aria-expanded={isToolsOpen}
                        onClick={() => {
                            setIsToolsOpen((prev) => !prev);
                            setIsProfileOpen(false);
                        }}
                    >
                        여행 도구
                        <span
                            className={`dropdown-arrow ${
                                isToolsOpen ? "open" : ""
                            }`}
                            aria-hidden="true"
                        >
                            ▾
                        </span>
                    </button>

                    {isToolsOpen && (
                        <div className="header-dropdown-menu">
                            <NavLink
                                to="/tools/budget"
                                onClick={closeMenus}
                            >
                                여행 경비 계산
                            </NavLink>

                            <NavLink
                                to="/tools/exchange"
                                onClick={closeMenus}
                            >
                                환율 계산
                            </NavLink>

                            <NavLink
                                to="/tools/weather"
                                onClick={closeMenus}
                            >
                                여행 날씨
                            </NavLink>

                            <NavLink
                                to="/tools/checklist"
                                onClick={closeMenus}
                            >
                                준비 체크리스트
                            </NavLink>
                        </div>
                    )}
                </div>
            </nav>

            <div className="header-account">
                {isLoggedIn ? (
                    <>
                        <NavLink
                            className="notification-button"
                            to="/notifications"
                            aria-label="알림"
                        >
                            🔔
                        </NavLink>

                        <div className="header-dropdown">
                            <button
                                type="button"
                                className="profile-button"
                                aria-expanded={isProfileOpen}
                                onClick={() => {
                                    setIsProfileOpen((prev) => !prev);
                                    setIsToolsOpen(false);
                                }}
                            >
                                <span className="profile-image">U</span>
                                <span>프로필</span>
                                <span
                                    className={`dropdown-arrow ${
                                        isProfileOpen ? "open" : ""
                                    }`}
                                    aria-hidden="true"
                                >
                                    ▾
                                </span>
                            </button>

                            {isProfileOpen && (
                                <div className="header-dropdown-menu profile-menu">
                                    <NavLink
                                        to="/mypage/profile"
                                        onClick={closeMenus}
                                    >
                                        내 정보
                                    </NavLink>

                                    <NavLink
                                        to="/mypage/posts"
                                        onClick={closeMenus}
                                    >
                                        내가 작성한 글
                                    </NavLink>

                                    <NavLink
                                        to="/mypage/bookmarks"
                                        onClick={closeMenus}
                                    >
                                        좋아요·북마크
                                    </NavLink>

                                    <NavLink
                                        to="/mypage/settings"
                                        onClick={closeMenus}
                                    >
                                        계정 설정
                                    </NavLink>

                                    <button
                                        type="button"
                                        className="logout-button"
                                    >
                                        로그아웃
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <NavLink className="login-link" to="/login">
                            로그인
                        </NavLink>

                        <NavLink className="signup-link" to="/signup">
                            회원가입
                        </NavLink>
                    </>
                )}
            </div>
        </header>
    );
}