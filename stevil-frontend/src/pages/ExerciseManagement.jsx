import React, { useState } from 'react';
import './ExerciseManagement.css';
// 💡 만들어두신 axiosInstance 경로로 수정하세요!
import axiosInstance from '../api/axiosInstance'; 

const ExerciseManagement = () => {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  
  // 기록 폼 상태 관리
  const [duration, setDuration] = useState('');
  const [condition, setCondition] = useState('NORMAL'); // 기본 컨디션

  // 1️⃣ 운동 검색 API 호출 함수
  const handleSearch = async () => {
    if (!keyword.trim()) return;
    
    try {
      // 우리가 백엔드에 만든 GET /api/exercises/search 호출!
      const response = await axiosInstance.get(`/exercises/search?keyword=${keyword}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("검색 실패:", error);
      alert("운동 검색 중 오류가 발생했습니다.");
    }
  };

  // 2️⃣ 리스트에서 운동을 선택했을 때
  const handleSelect = (exercise) => {
    setSelectedExercise(exercise);
    setDuration(''); // 폼 초기화
  };

  // 3️⃣ 운동 기록 저장 API 호출 함수
  const handleSaveRecord = async () => {
    if (!duration) {
      alert("운동 시간을 입력해주세요!");
      return;
    }

    try {
      const recordData = {
        userId: 1, // 임시 유저 ID (나중에 로그인 정보로 교체)
        exerciseId: selectedExercise.id, // DB에 있는 운동 고유 ID
        durationMinutes: parseInt(duration),
        conditionStatus: condition,
        logDate: new Date().toISOString().split('T')[0] // 오늘 날짜 (YYYY-MM-DD)
      };

      // 우리가 백엔드에 만들어둘 POST /api/exercise-logs 호출!
      await axiosInstance.post('/api/exercise-logs', recordData);
      
      alert(`'${selectedExercise.name}' 운동 기록이 완료되었습니다! 짝짝짝 🎉`);
      
      // 초기화
      setSelectedExercise(null);
      setKeyword('');
      setSearchResults([]);
      
    } catch (error) {
      console.error("저장 실패:", error);
      alert("운동 기록 저장에 실패했습니다.");
    }
  };

  return (
    <div className="exercise-page">
      <h2 className="page-title">💪 오늘의 운동 기록하기</h2>
      
      {/* 검색 바 */}
      <div className="search-section">
        <input 
          type="text" 
          className="search-input"
          placeholder="예: 걷기, 스쿼트, 벤치프레스"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="search-btn" onClick={handleSearch}>검색</button>
      </div>

      {/* 검색 결과 리스트 */}
      {searchResults.length > 0 && (
        <div className="result-list">
          {searchResults.map((exercise) => (
            <div key={exercise.id} className="exercise-item">
              <div className="exercise-info">
                <h4>{exercise.name}</h4>
                <p>{exercise.category} | 10분당 {exercise.caloriesPer10min}kcal 소모</p>
              </div>
              <button className="select-btn" onClick={() => handleSelect(exercise)}>
                선택
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 운동 기록 폼 (선택한 운동이 있을 때만 보임) */}
      {selectedExercise && (
        <div className="record-form-card">
          <h3>[{selectedExercise.name}] 기록 작성</h3>
          
          <div className="form-group">
            <label>운동 시간 (분)</label>
            <input 
              type="number" 
              placeholder="예: 30" 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>오늘의 컨디션</label>
            <select 
              value={condition} 
              onChange={(e) => setCondition(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              <option value="GOOD">최상! 너무 가벼움</option>
              <option value="NORMAL">보통 (할 만했음)</option>
              <option value="BAD">무거움/피로함</option>
              <option value="PAIN">통증/어지러움 있음 (주의)</option>
            </select>
          </div>

          <button className="save-btn" onClick={handleSaveRecord}>
            운동 기록 완료하기
          </button>
        </div>
      )}
    </div>
  );
};

export default ExerciseManagement;