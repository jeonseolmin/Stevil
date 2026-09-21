import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../nav.js";
import { IconBell } from "./Icons.jsx";

export default function Shell({ activeKey, children }) {
    return (
        <div className="dp-app dp-shell">
            <header className="dp-topbar">
                <span className="dp-topbar-brand">
                    <span className="dp-topbar-mark" aria-hidden="true">1</span>
                    Stevil
                </span>

                <nav className="dp-topbar-nav" aria-label="주요 메뉴">
                    {NAV_ITEMS.map(({ key, label, Icon, to }) => (
                        <NavLink key={key} to={to} className={key === activeKey ? "dp-active" : ""}>
                            <Icon />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="dp-topbar-actions">
                    <button type="button" className="dp-topbar-icon-btn" aria-label="알림">
                        <IconBell />
                    </button>
                    <NavLink to="/design-preview" className="dp-topbar-avatar" aria-label="Foundation 문서">1</NavLink>
                </div>
            </header>

            <div className="dp-shell-body">
                <main className="dp-shell-main">{children}</main>
            </div>

            <nav className="dp-bottomnav" aria-label="주요 메뉴">
                {NAV_ITEMS.map(({ key, label, Icon, to }) => (
                    <NavLink
                        key={key}
                        to={to}
                        className={`dp-bottomnav-item ${key === activeKey ? "dp-active" : ""}`}
                    >
                        <span className="dp-bottomnav-icon"><Icon /></span>
                        {label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
