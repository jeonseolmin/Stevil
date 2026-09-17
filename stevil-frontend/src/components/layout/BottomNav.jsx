import { useLocation, NavLink } from "react-router-dom";
import { IconHome, IconRecord, IconPlanner, IconHospital, IconProfile } from "../icons/Icons.jsx";

// Mobile/tablet app-shell navigation. Desktop (>=900px, matching Header's
// existing breakpoint) keeps the current top navigation in Header and hides
// this via CSS — see BottomNav.css.
//
// "기록" and "Planner" intentionally point at existing sections inside
// /dashboard rather than new routes: neither has a dedicated production
// page yet (Planner ships in a later phase), and the brief prohibits
// guessing routes. Same approach validated in design-preview (see
// src/design-preview/nav.js).
const NAV_ITEMS = [
    { key: "home", label: "홈", Icon: IconHome, to: "/dashboard" },
    { key: "records", label: "기록", Icon: IconRecord, to: "/dashboard#daily-records" },
    { key: "planner", label: "Planner", Icon: IconPlanner, to: "/dashboard#weekly-planner" },
    { key: "hospital", label: "병원", Icon: IconHospital, to: "/hospitals" },
    { key: "my", label: "MY", Icon: IconProfile, to: "/mypage" },
];

function isActive(item, pathname, hash) {
    const [itemPath, itemHash] = item.to.split("#");
    if (pathname !== itemPath) return false;
    if (item.key === "home") return !hash;
    return hash === `#${itemHash}`;
}

export default function BottomNav() {
    const { pathname, hash } = useLocation();

    return (
        <nav className="bottom-nav" aria-label="주요 메뉴">
            {NAV_ITEMS.map((item) => (
                <NavLink
                    key={item.key}
                    to={item.to}
                    className={`bottom-nav-item ${isActive(item, pathname, hash) ? "bottom-nav-item--active" : ""}`}
                >
                    <span className="bottom-nav-icon"><item.Icon /></span>
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
