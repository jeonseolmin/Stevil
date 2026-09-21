// Minimal single-weight line icons (stroke = currentColor). Replaces emoji
// glyphs from the first prototype pass — emoji read as placeholder/prototype
// rather than a considered product, which was one reason the redesign felt
// thin. Keep additions to this file rare and consistent (1.6 stroke, 20 grid).

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

export function IconScale(props) {
    return (
        <svg {...base} {...props}>
            <rect x="3" y="3" width="14" height="14" rx="4" />
            <path d="M10 7v6M7.3 10h5.4" />
        </svg>
    );
}

export function IconMeal(props) {
    return (
        <svg {...base} {...props}>
            <path d="M5 3v5.2a2 2 0 0 0 2 2v6.8M5 3v3M7 3v3M6 3v14" transform="translate(-1.2 0)" />
            <path d="M14.5 3c-1 0-1.8 1-1.8 3.2 0 1.6.6 2.7 1.3 3v7.8" />
        </svg>
    );
}

export function IconExercise(props) {
    return (
        <svg {...base} {...props}>
            <path d="M4 12.5 8 8l2 2 4.5-4.5" />
            <path d="M13 4h3v3" />
            <path d="M4 15.5h12" />
        </svg>
    );
}

export function IconInjection(props) {
    return (
        <svg {...base} {...props}>
            <path d="M13.8 3.2 16.8 6.2 8.6 14.4l-3.4.9.9-3.4 7.7-8.7Z" />
            <path d="M11.4 5.6l3 3M3.5 16.5l1.7-1.7" />
        </svg>
    );
}

export function IconChevron(props) {
    return (
        <svg {...base} {...props}>
            <path d="M7.5 4.5 13 10l-5.5 5.5" />
        </svg>
    );
}

export function IconPin(props) {
    return (
        <svg {...base} {...props}>
            <path d="M10 17.5s5.5-5.2 5.5-9.3A5.5 5.5 0 0 0 4.5 8.2c0 4.1 5.5 9.3 5.5 9.3Z" />
            <circle cx="10" cy="8.1" r="1.9" />
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

export function IconBell(props) {
    return (
        <svg {...base} {...props}>
            <path d="M5.5 8.5a4.5 4.5 0 0 1 9 0c0 3.4 1 4.7 1.5 5.3H4c.5-.6 1.5-1.9 1.5-5.3Z" />
            <path d="M8.3 15.8a1.8 1.8 0 0 0 3.4 0" />
        </svg>
    );
}
