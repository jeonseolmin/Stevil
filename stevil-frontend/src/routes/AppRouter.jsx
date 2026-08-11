import { Routes, Route } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout";
import Dashboard from "../pages/Dashboard";
import ExerciseManagement from "../pages/ExerciseManagement";
import HomePage from "../pages/homePage/HomePage.jsx";

function TemporaryPage({ title }) {
    return (
        <section style={{ padding: "40px" }}>
            <h1>{title}</h1>
        </section>
    );
}

export default function AppRouter() {
    return (
        <Routes>
            <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/exercise" element={<ExerciseManagement />} />
                <Route
                    path="/login"
                    element={<TemporaryPage title="로그인" />}
                />
                <Route
                    path="/signup"
                    element={<TemporaryPage title="회원가입" />}
                />
                <Route
                    path="*"
                    element={<TemporaryPage title="페이지를 찾을 수 없습니다." />}
                />
            </Route>
        </Routes>
    );
}