import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import ExerciseManagement from '../pages/ExerciseManagement';

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
        <Route path="/" element={<Dashboard />} />
        <Route path="/exercise" element={<ExerciseManagement />} />
          <Route path="/login" element={<TemporaryPage title="로그인" />} />
          <Route path="/signup" element={<TemporaryPage title="회원가입" />} />
          <Route path="*" element={<TemporaryPage title="페이지를 찾을 수 없습니다." />} />
        </Routes>
    );
}