import { Route, Routes } from "react-router-dom";
import RootLayout from "../components/layout/RootLayout.jsx";
import HomePage from "../pages/homePage/HomePage";

export default function AppRouter() {
  return (
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<h1>여행 탐색</h1>} />
          <Route path="/planner" element={<h1>AI 여행 만들기</h1>} />
          <Route path="/my-trips" element={<h1>내 여행</h1>} />
        </Route>

        <Route path="/login" element={<h1>로그인</h1>} />
        <Route path="*" element={<h1>페이지를 찾을 수 없습니다.</h1>} />
      </Routes>
  );
}