import {
    useEffect,
    useState,
} from "react";

import {
    Link,
    NavLink,
    useLocation,
    useNavigate,
} from "react-router-dom";

import axiosInstance from "../../api/axiosInstance";

import "./Header.css";

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const isPartnershipPage =
        location.pathname === "/partnership";

    const [userRole, setUserRole] = useState(
        () => localStorage.getItem("userRole")
    );

    const [isLoggedIn, setIsLoggedIn] =
        useState(() =>
            Boolean(
                localStorage.getItem(
                    "accessToken"
                )
            )
        );

    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const isAdmin =
        userRole === "ROLE_ADMIN";
        
    const isDoctor = 
        userRole === "ROLE_DOCTOR";

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem(
            "accessToken"
        );

        localStorage.removeItem(
            "userRole"
        );

        setIsLoggedIn(false);
        setUserRole(null);

        closeMenu();

        navigate("/", {
            replace: true,
        });
    };

    useEffect(() => {
        closeMenu();

        setIsLoggedIn(
            Boolean(
                localStorage.getItem(
                    "accessToken"
                )
            )
        );

        setUserRole(
            localStorage.getItem(
                "userRole"
            )
        );
    }, [
        location.pathname,
        location.hash,
    ]);

    useEffect(() => {
        const handleStorageChange = (
            event
        ) => {
            if (
                event.key ===
                "accessToken"
            ) {
                setIsLoggedIn(
                    Boolean(event.newValue)
                );
            }

            if (
                event.key === "userRole"
            ) {
                setUserRole(
                    event.newValue
                );
            }
        };

        window.addEventListener(
            "storage",
            handleStorageChange
        );

        return () => {
            window.removeEventListener(
                "storage",
                handleStorageChange
            );
        };
    }, []);

    useEffect(() => {
        if (!isMenuOpen) {
            return undefined;
        }

        const handleEscape = (
            event
        ) => {
            if (
                event.key === "Escape"
            ) {
                closeMenu();
            }
        };

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [isMenuOpen]);

    useEffect(() => {
        if (!isLoggedIn) {
            setUserRole(null);
            return undefined;
        }

        let active = true;

        const loadCurrentUser =
            async () => {
                try {
                    const response =
                        await axiosInstance.get(
                            "/users/me"
                        );

                    if (!active) {
                        return;
                    }

                    const role =
                        response.data.role;

                    setUserRole(role);

                    localStorage.setItem(
                        "userRole",
                        role
                    );
                } catch (error) {
                    if (!active) {
                        return;
                    }

                    console.error(
                        "헤더 사용자 정보 조회 실패:",
                        error.response?.status,
                        error.response?.data ??
                        error.message
                    );

                    if (
                        error.response
                            ?.status === 401 ||
                        error.response
                            ?.status === 403
                    ) {
                        localStorage.removeItem(
                            "accessToken"
                        );

                        localStorage.removeItem(
                            "userRole"
                        );

                        setIsLoggedIn(false);
                        setUserRole(null);
                    }
                }
            };

        loadCurrentUser();

        return () => {
            active = false;
        };
    }, [isLoggedIn]);

    return (
        <header className="site-header">
            <div className="header-inner">
                <Link
                    to={
                        isPartnershipPage
                            ? "/"
                            : isLoggedIn
                                ? "/dashboard"
                                : "/"
                    }
                    className="header-brand"
                    aria-label={
                        isPartnershipPage
                            ? "Stevil 홈으로 이동"
                            : isLoggedIn
                                ? "Stevil 대시보드"
                                : "Stevil 시작 페이지"
                    }
                    onClick={closeMenu}
                >
                    <span
                        className="brand-symbol"
                        aria-hidden="true"
                    >
                        1
                    </span>

                    <span className="brand-name">
                        Stevil
                    </span>
                </Link>

                <nav
                    id="header-navigation"
                    className={`header-navigation ${
                        isMenuOpen
                            ? "header-navigation--open"
                            : ""
                    }`}
                    aria-label={
                        isPartnershipPage
                            ? "제휴 안내 메뉴"
                            : "주요 메뉴"
                    }
                >
                    {isPartnershipPage ? (
                        <>
                            <Link
                                to="/partnership#partnership-intro"
                                onClick={
                                    closeMenu
                                }
                                className={
                                    !location.hash ||
                                    location.hash ===
                                    "#partnership-intro"
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                제휴 소개
                            </Link>

                            <Link
                                to="/partnership#partnership-target"
                                onClick={
                                    closeMenu
                                }
                                className={
                                    location.hash ===
                                    "#partnership-target"
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                제휴 대상
                            </Link>

                            <Link
                                to="/partnership#partnership-process"
                                onClick={
                                    closeMenu
                                }
                                className={
                                    location.hash ===
                                    "#partnership-process"
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                등록 절차
                            </Link>

                            <Link
                                to="/partnership#partnership-information"
                                onClick={
                                    closeMenu
                                }
                                className={
                                    location.hash ===
                                    "#partnership-information"
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                필요 정보
                            </Link>

                            <Link
                                to="/partnership#partnership-notice"
                                onClick={
                                    closeMenu
                                }
                                className={
                                    location.hash ===
                                    "#partnership-notice"
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                운영 안내
                            </Link>

                            <Link
                                to="/partnership#partnership-contact"
                                onClick={
                                    closeMenu
                                }
                                className={
                                    location.hash ===
                                    "#partnership-contact"
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                제휴 문의
                            </Link>
                        </>
                    ) : isLoggedIn ? (
                        <>
                            <NavLink
                                to="/dashboard"
                                onClick={
                                    closeMenu
                                }
                                className={({
                                                isActive,
                                            }) =>
                                    isActive
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                대시보드
                            </NavLink>

                            <NavLink
                                to="/hospitals"
                                onClick={
                                    closeMenu
                                }
                                className={({
                                                isActive,
                                            }) =>
                                    isActive
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                병원 찾기
                            </NavLink>

                            <NavLink
                                to="/diet"
                                onClick={
                                    closeMenu
                                }
                                className={({
                                                isActive,
                                            }) =>
                                    isActive
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                식단
                            </NavLink>

                            <NavLink
                                to="/exercise"
                                onClick={
                                    closeMenu
                                }
                                className={({
                                                isActive,
                                            }) =>
                                    isActive
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                운동
                            </NavLink>

                            <NavLink
                                to="/diary"
                                onClick={
                                    closeMenu
                                }
                                className={({
                                                isActive,
                                            }) =>
                                    isActive
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                투약 일지
                            </NavLink>

                            <NavLink
                                to="/community"
                                onClick={
                                    closeMenu
                                }
                                className={({
                                                isActive,
                                            }) =>
                                    isActive
                                        ? "header-navigation-link--active"
                                        : ""
                                }
                            >
                                커뮤니티
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <a
                                href="/#features"
                                onClick={
                                    closeMenu
                                }
                            >
                                주요 기능
                            </a>

                            <a
                                href="/#how-it-works"
                                onClick={
                                    closeMenu
                                }
                            >
                                이용 방법
                            </a>

                            <a
                                href="/#safety"
                                onClick={
                                    closeMenu
                                }
                            >
                                안심 안내
                            </a>

                            <a
                                href="/#partnership"
                                onClick={
                                    closeMenu
                                }
                            >
                                제휴 안내
                            </a>
                        </>
                    )}

                    <div className="mobile-header-actions">
                        {isLoggedIn ? (
                            <>
                                {isAdmin && (
                                    <Link
                                        to="/admin"
                                        className="header-admin-button"
                                        onClick={
                                            closeMenu
                                        }
                                    >
                                        관리자 메뉴
                                    </Link>
                                )}
                                
                                {isDoctor && (
                                    <Link
                                        to="/doctor/dashboard"
                                        className="header-admin-button"
                                        style={{ backgroundColor: '#0f766e', color: 'white' }}
                                        onClick={
                                            closeMenu
                                        }
                                    >
                                        의사 페이지
                                    </Link>
                                )}

                                <Link
                                    to="/mypage"
                                    className="header-login-link"
                                    onClick={closeMenu}
                                >
                                    마이페이지
                                </Link>

                                <button
                                    type="button"
                                    className="header-login-link"
                                    onClick={
                                        handleLogout
                                    }
                                >
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="header-login-link"
                                    onClick={
                                        closeMenu
                                    }
                                >
                                    로그인
                                </Link>

                                <Link
                                    to="/login"
                                    className="header-start-button"
                                    onClick={
                                        closeMenu
                                    }
                                >
                                    시작하기
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                <div className="desktop-header-actions">
                    {isPartnershipPage ? (
                        <Link
                            to="/"
                            className="header-login-link"
                            onClick={closeMenu}
                        >
                            홈으로
                        </Link>
                    ) : isLoggedIn ? (
                        <>
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="header-admin-button"
                                >
                                    관리자 메뉴
                                </Link>
                            )}
                            
                            {isDoctor && (
                                <Link
                                    to="/doctor/dashboard"
                                    className="header-admin-button"
                                    style={{ backgroundColor: '#0f766e', color: 'white' }}
                                    onClick={closeMenu}
                                >
                                    의사 페이지
                                </Link>
                            )}

                            <Link
                                to="/mypage"
                                className="header-login-link"
                                onClick={closeMenu}
                            >
                                마이페이지
                            </Link>

                            <button
                                type="button"
                                className="header-login-link"
                                onClick={
                                    handleLogout
                                }
                            >
                                로그아웃
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="header-login-link"
                            >
                                로그인
                            </Link>

                            <Link
                                to="/login"
                                className="header-start-button"
                            >
                                시작하기
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className={`header-menu-button ${
                        isMenuOpen
                            ? "header-menu-button--open"
                            : ""
                    }`}
                    aria-label={
                        isMenuOpen
                            ? "메뉴 닫기"
                            : "메뉴 열기"
                    }
                    aria-expanded={
                        isMenuOpen
                    }
                    aria-controls="header-navigation"
                    onClick={() => {
                        setIsMenuOpen(
                            (previous) =>
                                !previous
                        );
                    }}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>
        </header>
    );
}