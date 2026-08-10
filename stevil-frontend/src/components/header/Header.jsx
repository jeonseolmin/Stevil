import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./Header.css";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    useEffect(() => {
        closeMenu();
    }, [location.pathname, location.hash]);

    useEffect(() => {
        if (!isMenuOpen) {
            return undefined;
        }

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeMenu();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isMenuOpen]);

    return (
        <header className="site-header">
            <div className="header-inner">
                <Link
                    to="/"
                    className="header-brand"
                    aria-label="Stevil 시작 페이지"
                    onClick={closeMenu}
                >
          <span className="brand-symbol" aria-hidden="true">
            1
          </span>

                    <span className="brand-name">Stevil</span>
                </Link>

                <nav
                    id="header-navigation"
                    className={`header-navigation ${
                        isMenuOpen ? "header-navigation--open" : ""
                    }`}
                    aria-label="주요 메뉴"
                >
                    <a href="/#features" onClick={closeMenu}>
                        주요 기능
                    </a>

                    <a href="/#how-it-works" onClick={closeMenu}>
                        이용 방법
                    </a>

                    <a href="/#safety" onClick={closeMenu}>
                        안심 안내
                    </a>

                    <div className="mobile-header-actions">
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
                    </div>
                </nav>

                <div className="desktop-header-actions">
                    <Link to="/login" className="header-login-link">
                        로그인
                    </Link>

                    <Link to="/login" className="header-start-button">
                        시작하기
                    </Link>
                </div>

                <button
                    type="button"
                    className={`header-menu-button ${
                        isMenuOpen ? "header-menu-button--open" : ""
                    }`}
                    aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                    aria-expanded={isMenuOpen}
                    aria-controls="header-navigation"
                    onClick={() => setIsMenuOpen((previous) => !previous)}
                >
                    <span />
                    <span />
                    <span />
                </button>
            </div>
        </header>
    );
}