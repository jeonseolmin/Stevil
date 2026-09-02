import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    Link,
    NavLink,
    useLocation,
} from "react-router-dom";

import axiosInstance, {
    clearAccessToken,
} from "../../api/axiosInstance";

import "./Header.css";
import { logout } from "../../api/authApi";

export default function Header() {
    const location = useLocation();

    const isPartnershipPage =
        location.pathname === "/partnership";

    /*
     * Access Token은 더 이상 localStorage에 저장하지 않습니다.
     *
     * 로그인 여부는 실제 서버의 /users/me 응답으로 판단합니다.
     */
    const [isLoggedIn, setIsLoggedIn] =
        useState(false);

    const [userRole, setUserRole] =
        useState(() =>
            localStorage.getItem(
                "userRole"
            )
        );

    const [isAuthChecking, setIsAuthChecking] =
        useState(true);

    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const isAdmin =
        userRole === "ROLE_ADMIN";

    const closeMenu = useCallback(() => {
        setIsMenuOpen(false);
    }, []);

    /*
     * 현재 사용자 인증 상태 확인
     *
     * Access Token이 메모리에 있으면 그대로 사용합니다.
     *
     * F5 등으로 Access Token이 사라졌다면
     * axios interceptor가:
     *
     * /users/me
     *      ↓ 401
     * /auth/refresh
     *      ↓
     * 새 Access Token
     *      ↓
     * /users/me 재요청
     *
     * 을 자동 처리합니다.
     */
    const checkAuthentication =
        useCallback(async () => {
            try {
                const response =
                    await axiosInstance.get(
                        "/users/me"
                    );

                if (!response.data || typeof response.data !== "object" || !response.data.id || !response.data.role) {
                    throw new Error("인증된 사용자 정보가 아닙니다.");
                }

                const role =
                    response.data.role;

                setIsLoggedIn(true);
                setUserRole(role);

                /*
                 * userRole은 인증 수단이 아니라
                 * 화면 표시 편의를 위한 값입니다.
                 *
                 * 실제 권한 검사는 백엔드
                 * Spring Security가 담당합니다.
                 */
                if (role) {
                    localStorage.setItem(
                        "userRole",
                        role
                    );
                } else {
                    localStorage.removeItem(
                        "userRole"
                    );
                }
            } catch (error) {
                /*
                 * Refresh Token까지 유효하지 않다면
                 * 실제 로그아웃 상태입니다.
                 */
                setIsLoggedIn(false);
                setUserRole(null);

                clearAccessToken();

                localStorage.removeItem(
                    "userRole"
                );

                /*
                 * 로그인하지 않은 상태에서
                 * /users/me가 401인 것은 정상적인 경우이므로
                 * 필요 이상으로 콘솔 에러를 남기지 않습니다.
                 */
                if (
                    error.response?.status !== 401 &&
                    error.response?.status !== 403
                ) {
                    console.error(
                        "헤더 사용자 정보 조회 실패:",
                        error.response?.status,
                        error.response?.data ??
                        error.message
                    );
                }
            } finally {
                setIsAuthChecking(false);
            }
        }, []);

    /*
     * 로그아웃
     *
     * 1. 서버 Refresh Token revoke
     * 2. HttpOnly Refresh Cookie 삭제
     * 3. 메모리 Access Token 제거
     * 4. 프론트 로그인 상태 초기화
     */
    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error(
                "로그아웃 요청 실패:",
                error.response?.status,
                error.response?.data ??
                error.message
            );
            window.alert("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
    };

    /*
     * URL이 변경되면 모바일 메뉴를 닫습니다.
     */
    useEffect(() => {
        closeMenu();
    }, [
        location.pathname,
        location.hash,
        closeMenu,
    ]);

    /*
     * 앱 진입 / 페이지 이동 시 인증 상태 확인
     *
     * 특히 F5 후에는 Access Token이 메모리에서
     * 사라져 있으므로 Refresh Token을 이용해
     * 인증 상태를 복원합니다.
     */
    useEffect(() => {
        let active = true;

        // The callback page owns token rotation until navigation completes.
        if (location.pathname === "/oauth-success") return;

        const verifyAuthentication =
            async () => {
                if (!active) {
                    return;
                }

                await checkAuthentication();
            };

        verifyAuthentication();

        return () => {
            active = false;
        };
    }, [
        location.pathname,
        checkAuthentication,
    ]);

    /*
     * 다른 탭에서 userRole 값이 변경되는 경우
     * 현재 탭의 화면 표시도 갱신합니다.
     *
     * 실제 인증 여부는 여전히 /users/me가 결정합니다.
     */
    useEffect(() => {
        const handleStorageChange = (
            event
        ) => {
            if (
                event.key === "userRole"
            ) {
                setUserRole(
                    event.newValue
                );

                checkAuthentication();
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
    }, [checkAuthentication]);

    /*
     * 모바일 메뉴가 열려 있을 때
     * Escape 키로 닫습니다.
     */
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
    }, [
        isMenuOpen,
        closeMenu,
    ]);

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
                        {isAuthChecking ? null : isLoggedIn ? (
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
                            onClick={
                                closeMenu
                            }
                        >
                            홈으로
                        </Link>
                    ) : isAuthChecking ? null : isLoggedIn ? (
                        <>
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    className="header-admin-button"
                                >
                                    관리자 메뉴
                                </Link>
                            )}

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
