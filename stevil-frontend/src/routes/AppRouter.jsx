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

                {/* 🔥 화이트보드에서 기획하신 '3분할 일정 만들기' UI가 들어갈 핵심 자리입니다 */}
                <Route
                    path="/planner"
                    element={<TemporaryPage title="AI 여행 만들기 (일정표 작업 예정)" />}
                />

                <Route path="/explore" element={<TemporaryPage title="여행지 탐색" />} />
                <Route path="/my-trips" element={<TemporaryPage title="내 여행" />} />
                <Route path="/community" element={<TemporaryPage title="커뮤니티" />} />
                
                <Route path="/tools/budget" element={<TemporaryPage title="여행 경비 계산" />} />
                <Route path="/tools/exchange" element={<TemporaryPage title="환율 계산" />} />
                <Route path="/tools/weather" element={<TemporaryPage title="여행 날씨" />} />
                <Route path="/tools/checklist" element={<TemporaryPage title="준비 체크리스트" />} />
                <Route path="/notifications" element={<TemporaryPage title="알림" />} />
                
                <Route path="/mypage/profile" element={<TemporaryPage title="내 정보" />} />
                <Route path="/mypage/posts" element={<TemporaryPage title="내가 작성한 글" />} />
                <Route path="/mypage/bookmarks" element={<TemporaryPage title="좋아요·북마크" />} />
                <Route path="/mypage/settings" element={<TemporaryPage title="계정 설정" />} />
                <Route path="/login" element={<TemporaryPage title="로그인" />} />
                <Route path="/signup" element={<TemporaryPage title="회원가입" />} />
            </Route>

            <Route path="*" element={<TemporaryPage title="페이지를 찾을 수 없습니다." />} />
        </Routes>
        </WishlistProvider>
    );
}