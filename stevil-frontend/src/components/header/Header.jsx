import { useEffect, useState } from "react";
import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";
import "./Header.css";

export default function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(
        () => Boolean(localStorage.getItem("accessToken"))
    );

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");

        setIsLoggedIn(false);
        closeMenu();

        navigate("/", {
            replace: true,
        });
    };

    /*
     * 페이지가 이동될 때:
     * 1. 모바일 메뉴 닫기
     * 2. localStorage의 토큰 상태 다시 확인
     *
     * OAuthSuccessPage에서 토큰 저장 후 대시보드로 이동하면
     * Header도 로그인 상태로 변경됩니다.
     */
    useEffect(() => {
        closeMenu();

        setIsLoggedIn(
            Boolean(localStorage.getItem("accessToken"))
        );
    }, [location.pathname, location.hash]);

    /*
     * 다른 탭에서 로그인 또는 로그아웃했을 때
     * 현재 탭의 Header도 상태를 갱신합니다.
     */
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === "accessToken") {
                setIsLoggedIn(Boolean(event.newValue));
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

    /*
     * 모바일 메뉴가 열려 있을 때
     * Escape 키로 닫을 수 있도록 처리합니다.
     */
    useEffect(() => {
        if (!isMenuOpen) {
            return undefined;
        }

        const handleEscape = (event) => {
            if (event.key === "Escape") {
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

    return (
        <header className="site-header">
            <div className="header-inner">
                <Link
                    to={isLoggedIn ? "/dashboard" : "/"}
                    className="header-brand"
                    aria-label={
                        isLoggedIn
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
                    aria-label="주요 메뉴"
                >
                    {isLoggedIn && (
                        <Link
                            to="/hospitals"
                            onClick={closeMenu}
                            className={
                                location.pathname === "/hospitals"
                                    ? "header-navigation-link--active"
                                    : ""
                            }
                        >
                            병원 찾기
                        </Link>
                    )}

                    <a
                        href="/#features"
                        onClick={closeMenu}
                    >
                        주요 기능
                    </a>

                    <a
                        href="/#how-it-works"
                        onClick={closeMenu}
                    >
                        이용 방법
                    </a>

                    <a
                        href="/#safety"
                        onClick={closeMenu}
                    >
                        안심 안내
                    </a>

                    <a
                        href="/community"
                        onClick={closeMenu}
                    >
                        커뮤니티
                    </a>

                    <div className="mobile-header-actions">
                        {isLoggedIn ? (
                            <button
                                type="button"
                                className="header-login-link"
                                onClick={handleLogout}
                            >
                                로그아웃
                            </button>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="header-login-link"
                                    onClick={closeMenu}
                                >
                                    로그인
                                </Link>

                                <Link
                                    to="/login"
                                    className="header-start-button"
                                    onClick={closeMenu}
                                >
                                    시작하기
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                <div className="desktop-header-actions">
                    {isLoggedIn ? (
                        <button
                            type="button"
                            className="header-login-link"
                            onClick={handleLogout}
                        >
                            로그아웃
                        </button>
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
                    aria-expanded={isMenuOpen}
                    aria-controls="header-navigation"
                    onClick={() => {
                        setIsMenuOpen(
                            (previous) => !previous
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