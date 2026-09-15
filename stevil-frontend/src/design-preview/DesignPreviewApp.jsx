import { Navigate, Route, Routes } from "react-router-dom";

import "./tokens.css";
import "./components.css";

import Foundation from "./pages/Foundation.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Planner from "./pages/Planner.jsx";
import Hospital from "./pages/Hospital.jsx";
import MyPage from "./pages/MyPage.jsx";

// Local-only design preview. Mounted at /design-preview/* in AppRouter,
// completely separate from the production RootLayout/Header — nothing
// here is reachable from real navigation and nothing production reads
// these files. See CLAUDE.md-adjacent instructions in the conversation
// for why: this is a prototype for local review, not a shipped route.
export default function DesignPreviewApp() {
    return (
        <Routes>
            <Route index element={<Foundation />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="planner" element={<Planner />} />
            <Route path="hospital" element={<Hospital />} />
            <Route path="my" element={<MyPage />} />
            <Route path="*" element={<Navigate to="/design-preview" replace />} />
        </Routes>
    );
}
