import { Route, Routes } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout.jsx";
import HomePage from "../pages/homePage/HomePage.jsx";
import { WishlistProvider } from "../context/WishlistContext.jsx";

function TemporaryPage({ title }) {
    return (
        <section style={{ padding: "40px" }}>
            <h1>{title}</h1>
        </section>
    );
}

export default function AppRouter() {
    return (
        <WishlistProvider>
        <Routes>
            <Route element={<RootLayout />}>
                <Route path="/" element={<HomePage />} />

                <Route path="/login" element={<TemporaryPage title="로그인" />} />
                <Route path="/signup" element={<TemporaryPage title="회원가입" />} />
            </Route>

            <Route path="*" element={<TemporaryPage title="페이지를 찾을 수 없습니다." />} />
        </Routes>
        </WishlistProvider>
    );
}