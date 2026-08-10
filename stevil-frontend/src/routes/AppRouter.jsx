import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Dashboard from '../pages/Dashboard';
import ExerciseManagement from '../pages/ExerciseManagement';

import NotFound from '../pages/NotFound';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exercise" element={<ExerciseManagement />} />
        

        {/* 지정되지 않은 이상한 주소로 접속했을 때 띄울 404 페이지 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}