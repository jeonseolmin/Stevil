import { IconHome, IconRecord, IconPlanner, IconHospital, IconProfile } from "./components/Icons.jsx";

// Bottom nav / top nav IA for the design preview.
// 기록 intentionally points at the Dashboard's "오늘의 기록" section instead of
// a dedicated page — Diet/Exercise/Weight/Diary keep their own routes and get
// reached from there, per the brief's "secondary nav inside a tab" direction.
export const NAV_ITEMS = [
    { key: "home", label: "홈", Icon: IconHome, to: "/design-preview/dashboard" },
    { key: "records", label: "기록", Icon: IconRecord, to: "/design-preview/dashboard#today" },
    { key: "planner", label: "Planner", Icon: IconPlanner, to: "/design-preview/planner" },
    { key: "hospital", label: "병원", Icon: IconHospital, to: "/design-preview/hospital" },
    { key: "my", label: "MY", Icon: IconProfile, to: "/design-preview/my" },
];
