import { Route, Routes } from "react-router-dom";

import RootLayout from "../components/layout/RootLayout";
import AuthLayout from "../components/layout/auth/AuthLayout.jsx";

import HomePage from "../pages/homePage/HomePage";
import LoginPage from "../pages/auth/LoginPage.jsx";
import OnboardingPage from "../pages/onboarding/OnboardingPage";
import Dashboard from "../pages/Dashboard";
import ExerciseManagement from "../pages/ExerciseManagement.jsx";
import OAuthSuccessPage from "../pages/auth/OAuthSuccessPage.jsx";

export default function AppRouter() {
    return (
        <Routes>
            {/* 공통 헤더를 사용하는 화면 */}
            <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/exercise" element={<ExerciseManagement />} />
                <Route path="/oauth-success" element={<OAuthSuccessPage />} />
            </Route>

            {/* 인증 전용 화면 */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* 최초 로그인 후 추가 정보 입력 */}
            <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
    );
}