import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Dashboard from '../pages/Dashboard';
import ExerciseManagement from '../pages/ExerciseManagement';


export default function AppRouter() {
  return (

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/exercise" element={<ExerciseManagement />} />

      </Routes>

  );
}