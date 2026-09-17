// Minimal single-weight line icons (stroke = currentColor), replacing emoji
// glyphs used across the app. Same visual language as design-preview's
// Icons.jsx (20px grid, 1.6 stroke) — kept as a separate production copy so
// this file stays independent of the design-preview prototype.

const base = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
};

export function IconHome(props) {
    return (
        <svg {...base} {...props}>
            <path d="M3 9.5 10 3l7 6.5" />
            <path d="M5 8.5V17h10V8.5" />
            <path d="M8 17v-4.5h4V17" />
        </svg>
    );
}

export function IconRecord(props) {
    return (
        <svg {...base} {...props}>
            <rect x="4" y="3" width="12" height="14" rx="2" />
            <path d="M7.5 7.5h5M7.5 10.5h5M7.5 13.5h3" />
        </svg>
    );
}

export function IconPlanner(props) {
    return (
        <svg {...base} {...props}>
            <rect x="3.5" y="4" width="13" height="12.5" rx="2" />
            <path d="M3.5 8h13" />
            <path d="M7 2.5v3M13 2.5v3" />
        </svg>
    );
}

export function IconHospital(props) {
    return (
        <svg {...base} {...props}>
            <path d="M10 2.5c3.5 3 5.5 6 5.5 8.8a5.5 5.5 0 1 1-11 0c0-2.8 2-5.8 5.5-8.8Z" />
            <path d="M10 8.3v5M7.6 10.8h4.8" />
        </svg>
    );
}

export function IconProfile(props) {
    return (
        <svg {...base} {...props}>
            <circle cx="10" cy="6.8" r="3.3" />
            <path d="M3.7 17c.9-3.4 3.6-5.2 6.3-5.2s5.4 1.8 6.3 5.2" />
        </svg>
    );
}

export function IconSearch(props) {
    return (
        <svg {...base} {...props}>
            <circle cx="8.6" cy="8.6" r="5.1" />
            <path d="M16 16l-3.6-3.6" />
        </svg>
    );
}

export function IconInfo(props) {
    return (
        <svg {...base} {...props}>
            <circle cx="10" cy="10" r="7" />
            <path d="M10 9.2v4.6" strokeWidth="1.6" />
            <path d="M10 6.4v.01" strokeWidth="2.4" />
        </svg>
    );
}
