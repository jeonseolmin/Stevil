import { useState, useEffect } from 'react';
import './ExerciseCard.css'; 
import axiosInstance from '../../api/axiosInstance'; 

const ExerciseCard = () => {
  const [workoutCount, setWorkoutCount] = useState(0);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      const userId = 1;
      const startDate = '2026-08-03';
      const endDate = '2026-08-09';
      
      const response = await axiosInstance.get('/exercise-logs/weekly-chart', {
        params: {
          userId: userId,
          startDate: startDate,
          endDate: endDate
        }
      });
      
      // axios는 자동으로 JSON을 파싱해서 response.data 안에 넣어줍니다.
      setWorkoutCount(response.data.length);
      
    } catch (error) {
      console.error('API 연동 에러:', error);
      // 필요하다면 여기서 alert 창을 띄우거나 에러 상태를 업데이트할 수 있습니다.
    }
  };

  const handleRecordClick = () => {
    alert('운동 기록 모달창을 엽니다!');
  };

  return (
    <div className="exercise-card">
      <h3 className="card-title">운동 기록</h3>
      
      <div className="progress-section">
        <p className="progress-label">이번 주 운동</p>
        <h2 className="progress-count">
          <span>{workoutCount}</span> / 5회
        </h2>
      </div>

      <div className="category-icons">
        <div className={`icon-item ${workoutCount > 0 ? 'active' : ''}`}>
          <span className="icon-emoji">🏃‍♂️</span>
          <span className="icon-label">유산소</span>
        </div>
        
        <div className={`icon-item ${workoutCount > 1 ? 'active' : ''}`}>
          <span className="icon-emoji">🏋️‍♀️</span>
          <span className="icon-label">근력</span>
        </div>
        
        <div className={`icon-item ${workoutCount > 2 ? 'active' : ''}`}>
          <span className="icon-emoji">🧘‍♂️</span>
          <span className="icon-label">스트레칭</span>
        </div>
      </div>

      <button className="record-btn" onClick={handleRecordClick}>
        운동 기록하기
      </button>
    </div>
  );
};

export default ExerciseCard;