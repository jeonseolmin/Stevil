import { useState, useEffect } from 'react';
import './ExerciseManagement.css';
import axiosInstance from '../api/axiosInstance'; 

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ExerciseManagement = () => {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState(null);
  
  const [duration, setDuration] = useState('');
  const [sets, setSets] = useState('');
  const [repsPerSet, setRepsPerSet] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [memo, setMemo] = useState('');
  
  const [intensity, setIntensity] = useState('MEDIUM');
  const [condition, setCondition] = useState('NORMAL');
  
  const [exerciseStats, setExerciseStats] = useState([]);
  const [viewMode, setViewMode] = useState('WEEKLY'); 
  const [dateRangeText, setDateRangeText] = useState(''); 

  const isAerobic = selectedExercise?.category?.includes('유산소');

  useEffect(() => {
    fetchStats();
  }, [viewMode]);

  const fetchStats = async () => {
    try {
      const userId = 1;
      const today = new Date();
      let startDay = new Date(today);

      if (viewMode === 'DAILY') {
        startDay = today; 
      } else if (viewMode === 'WEEKLY') {
        startDay.setDate(today.getDate() - 7); 
      } else if (viewMode === 'MONTHLY') {
        startDay.setDate(today.getDate() - 30); 
      }

      const endDate = today.toISOString().split('T')[0];
      const startDate = startDay.toISOString().split('T')[0];
      
      setDateRangeText(`${startDate} ~ ${endDate}`);

      const response = await axiosInstance.get('/exercise-logs/details', {
        params: { userId, startDate, endDate }
      });
      setExerciseStats(response.data); 
    } catch (error) {
      console.error("통계 조회 실패", error);
      setExerciseStats([]);
    }
  };

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    try {
      const response = await axiosInstance.get(`http://localhost:8080/api/exercises/search?keyword=${keyword}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("검색 실패:", error);
    }
  };

  const handleSaveRecord = async () => {
    if (!duration) {
      alert("운동 시간을 입력해주세요!");
      return;
    }
    if (!isAerobic && !sets) {
      alert("무산소 운동은 세트 수를 필수로 입력해야 합니다!");
      return;
    }
    if (condition === 'PAIN' || condition === 'BAD') {
      const confirmForce = window.confirm("컨디션이 좋지 않습니다. 무리한 운동은 부상을 유발할 수 있습니다. 정말 기록하시겠습니까?");
      if (!confirmForce) return;
    }

    try {
      const recordData = {
        userId: 1,
        exerciseId: selectedExercise.id,
        durationMinutes: parseInt(duration),
        sets: isAerobic ? 1 : parseInt(sets),
        repsPerSet: isAerobic ? null : (repsPerSet ? parseInt(repsPerSet) : null),
        weightKg: isAerobic ? null : (weightKg ? parseFloat(weightKg) : null),
        memo: memo ? memo : null,
        intensityLevel: intensity,
        conditionStatus: condition,
        status: 'COMPLETED',
        exerciseDate: new Date().toISOString().split('T')[0]
      };

      await axiosInstance.post('http://localhost:8080/api/exercise-logs', recordData);
      alert('운동 기록이 저장되었습니다!');
      
      setSelectedExercise(null);
      setKeyword('');
      setSearchResults([]);
      setDuration('');
      setSets('');
      setRepsPerSet('');
      setWeightKg('');
      setMemo('');
      fetchStats(); 
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const calculateEstimatedCalories = () => {
    if (!selectedExercise) return 0;
    const calPer10min = selectedExercise.caloriesPer10Min ?? selectedExercise.caloriesPer10min ?? 50;
    const dur = parseFloat(duration) || 0;
    const baseCal = (dur / 10.0) * calPer10min;

    if (isAerobic) {
      return Math.floor(baseCal);
    } else {
      const s = parseInt(sets) || 1;
      return Math.floor(baseCal * s);
    }
  };

  const categoryTotals = exerciseStats.reduce((acc, log) => {
    const cat = log.category || '미분류 운동'; 
    const cal = log.burnedCalories || log.totalCalories || log.calories || 0;
    acc[cat] = (acc[cat] || 0) + cal;
    return acc;
  }, {});

  const chartLabels = Object.keys(categoryTotals);
  const chartDataValues = Object.values(categoryTotals);

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['운동 안한 날 (휴식)'],
    datasets: [
      {
        data: chartLabels.length > 0 ? chartDataValues : [1],
        backgroundColor: [
          '#1abc9c', // 청록색
          '#41b3ff', // 하늘색
          '#fdcb6e', // 노란색
          '#6c5ce7'  // 보라색
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            return chartLabels.length > 0 ? `분류: ${context[0].label}` : '휴식 중';
          },
          label: function(context) {
            if (chartLabels.length === 0) return ' 운동 기록 없음';
            const cal = context.raw;
            return ` 총 소모: ${cal} kcal`;
          }
        }
      }
    }
  };

  return (
    <div className="exercise-page">
      <h2 className="page-title">본인의 운동 일정 및 상세 관리</h2>

      <div className="stats-container-card">
        <h3>전체 운동량 및 칼로리 소모량 (유산소 vs 무산소)</h3>
        <p className="date-range-text">{dateRangeText}</p>
        
        <div className="view-mode-buttons">
          <button 
            className={`view-btn ${viewMode === 'DAILY' ? 'active' : ''}`}
            onClick={() => setViewMode('DAILY')} 
          >
            오늘 (일간)
          </button>
          <button 
            className={`view-btn ${viewMode === 'WEEKLY' ? 'active' : ''}`}
            onClick={() => setViewMode('WEEKLY')} 
          >
            최근 7일 (주간)
          </button>
          <button 
            className={`view-btn ${viewMode === 'MONTHLY' ? 'active' : ''}`}
            onClick={() => setViewMode('MONTHLY')} 
          >
            최근 30일 (월간)
          </button>
        </div>

        {exerciseStats.length === 0 ? (
          <div className="default-chart-box">
            <p className="default-chart-text">📈 선택한 기간의 운동 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="chart-wrapper">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        )}
      </div>

      <div className="search-record-section">
        <h3>운동 종류 및 상세 기록 추가</h3>
        <div className="search-section">
          <input 
            type="text" 
            className="search-input"
            placeholder="운동 검색 (예: 스쿼트, 걷기)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>검색</button>
        </div>

        {searchResults.length > 0 && (
          <div className="result-list">
            {searchResults.map((ex) => (
              <div key={ex.id} className="exercise-item">
                <div className="exercise-info">
                  <h4>{ex.name}</h4>
                  <p className="exercise-calorie">
                    {ex.category} | 10분당 소모 칼로리: {ex.caloriesPer10Min ?? ex.caloriesPer10min ?? 50} kcal
                  </p>
                </div>
                <button className="select-btn" onClick={() => setSelectedExercise(ex)}>선택</button>
              </div>
            ))}
          </div>
        )}

        {selectedExercise && (
          <div className="record-form-card">
            <h3>[{selectedExercise.name}] 상세 기록 작성</h3>
            
            <div className="expected-calorie-box">
              예상 소모 칼로리: 약 {calculateEstimatedCalories()} kcal 소모 예정
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>운동 시간 (분)*</label>
                <input type="number" placeholder="예: 30" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              
              {!isAerobic && (
                <div className="form-group">
                  <label>세트 수*</label>
                  <input type="number" placeholder="예: 3" value={sets} onChange={(e) => setSets(e.target.value)} />
                </div>
              )}
            </div>

            {!isAerobic && (
              <div className="form-row">
                <div className="form-group">
                  <label>세트당 횟수 (Reps)</label>
                  <input type="number" placeholder="예: 12" value={repsPerSet} onChange={(e) => setRepsPerSet(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>중량 (kg)</label>
                  <input type="number" step="0.5" placeholder="예: 50" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>운동 강도</label>
                <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
                  <option value="LOW">약함</option>
                  <option value="MEDIUM">보통</option>
                  <option value="HIGH">강함</option>
                </select>
              </div>
              <div className="form-group">
                <label>오늘의 컨디션</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="GOOD">컨디션 최상</option>
                  <option value="NORMAL">보통</option>
                  <option value="BAD">피로함</option>
                  <option value="PAIN">통증/어지러움 있음 (주의)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>운동 메모 / 특이사항 (병원 제공용)</label>
              <input type="text" placeholder="예: 오른쪽 무릎이 살짝 뻐근했음" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>

            <button className="save-btn" onClick={handleSaveRecord}>운동 기록 완료 및 저장</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseManagement;