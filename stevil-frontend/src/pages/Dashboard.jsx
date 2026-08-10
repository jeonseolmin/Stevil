import React from 'react';
// 우리가 만든 운동 카드 컴포넌트를 불러옵니다.
import ExerciseCard from '../components/exerciseCard/ExerciseCard'; 
import '../styles/Dashboard.css'; // 대시보드 전체 레이아웃 CSS (필요시)

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      <h2>오늘의 대시보드</h2>
      
      {/* 
        이곳에 체중 그래프, 식단 기록 등 
        다른 컴포넌트들도 함께 조립됩니다. 
      */}
      
      <div className="card-grid">
        {/* 방금 만든 운동 기록 카드를 대시보드 화면에 배치! */}
        <ExerciseCard />
      </div>
    </div>
  );
};

export default Dashboard;