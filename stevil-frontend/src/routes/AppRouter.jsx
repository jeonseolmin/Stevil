import { Route, Routes } from "react-router-dom";

import RootLayout from "../components/layout/RootLayout";
import AuthLayout from "../components/layout/auth/AuthLayout.jsx";

import HomePage from "../pages/homePage/HomePage";
import LoginPage from "../pages/auth/LoginPage.jsx";
import OnboardingPage from "../pages/onboarding/OnboardingPage";
import Dashboard from "../pages/Dashboard";
import ExerciseManagement from "../pages/ExerciseManagement.jsx";
import DietManagement from "../components/diet/DietManagement.jsx";
import InjectionDiary from "../components/injectionDiary/InjectionDiary.jsx";
import OAuthSuccessPage from "../pages/auth/OAuthSuccessPage.jsx";
import HospitalMapPage from "../pages/HospitalMapPage.jsx";
import CommunityList from "../pages/community/CommunityList.jsx";
import CommunityDetail from "../pages/community/CommunityDetail.jsx";
import CommunityWrite from "../pages/community/CommunityWrite.jsx";
import CommunityEdit from "../pages/community/CommunityEdit.jsx";
import AdminReportsPage from "../pages/admin/reports/AdminReportsPage.jsx";
import AdminLayout from "../components/layout/admin/AdminLayout.jsx";
import AdminDashboardPage from "../pages/admin/dashboard/AdminDashboardPage.jsx";
import WeightRecordPage from "../pages/weight/WeightRecordPage.jsx";
import AdminUsersPage from "../pages/admin/users/AdminUsersPage.jsx";
import AdminFacilitiesPage from "../pages/admin/facilites/AdminFacilitiesPage.jsx";
import AdminInquiriesPage from "../pages/admin/inquiries/AdminInquiriesPage.jsx";
import AdminContentsPage from "../pages/admin/contents/AdminContentsPage.jsx";


export default function AppRouter() {
    return (
        <Routes>
            {/* 공통 헤더를 사용하는 화면 */}
            <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/exercise" element={<ExerciseManagement />} />
                <Route path="/diet" element={<DietManagement />} />
                <Route path="/diary" element={<InjectionDiary />} />
                <Route path="/oauth-success" element={<OAuthSuccessPage />} />
                <Route path="/hospitals" element={<HospitalMapPage />}/>                
                <Route path="/community" element={<CommunityList />} />
                <Route path="/community/write" element={<CommunityWrite />} />
                <Route path="/community/:id" element={<CommunityDetail />} />
                <Route path="/community/edit/:id" element={<CommunityEdit />} />
                <Route path="/weight" element={<WeightRecordPage />}/>
            </Route>

            {/* 인증 전용 화면 */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="facilities" element={<AdminFacilitiesPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="inquiries" element={<AdminInquiriesPage />} />
                <Route path="contents" element={<AdminContentsPage />} />
            </Route>

            {/* 최초 로그인 후 추가 정보 입력 */}
            <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
    );
}