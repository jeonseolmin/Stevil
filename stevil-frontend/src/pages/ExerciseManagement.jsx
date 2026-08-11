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
  const [weeklyLogs, setWeeklyLogs] = useState([]);

  useEffect(() => {
    fetchWeeklyStats();
  }, []);

  const fetchWeeklyStats = async () => {
    try {
      const userId = 1;
      const today = new Date();
      const endDate = today.toISOString().split('T')[0];
      
      const startDay = new Date(today);
      startDay.setDate(today.getDate() - 7);
      const startDate = startDay.toISOString().split('T')[0];

      // 원래 사용하시던 정상 동작 API 경로
      const response = await axiosInstance.get('/exercise-logs/weekly-chart', {
        params: { userId, startDate, endDate }
      });
      setWeeklyLogs(response.data); 
    } catch (error) {
      console.error("통계 조회 실패", error);
      setWeeklyLogs([]);
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
    if (!duration || !sets) {
      alert("운동 시간과 세트 수는 필수 입력 항목입니다!");
      return;
    }

    if (condition === 'PAIN' || condition === 'BAD') {
      const confirmForce = window.confirm("⚠️ 컨디션이 좋지 않습니다. 무리한 운동은 부상을 유발할 수 있습니다. 정말 기록하시겠습니까?");
      if (!confirmForce) return;
    }

    try {
      const recordData = {
        userId: 1,
        exerciseId: selectedExercise.id,
        durationMinutes: parseInt(duration),
        sets: parseInt(sets),
        repsPerSet: repsPerSet ? parseInt(repsPerSet) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        memo: memo ? memo : null,
        intensityLevel: intensity,
        conditionStatus: condition,
        status: 'COMPLETED',
        exerciseDate: new Date().toISOString().split('T')[0]
      };

      await axiosInstance.post('http://localhost:8080/api/exercise-logs', recordData);
      alert('운동 상세 기록이 안전하게 저장되었습니다! 🎉');
      
      setSelectedExercise(null);
      setKeyword('');
      setSearchResults([]);
      setDuration('');
      setSets('');
      setRepsPerSet('');
      setWeightKg('');
      setMemo('');
      fetchWeeklyStats(); 
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장에 실패했습니다.");
    }
  };

  const calculateEstimatedCalories = () => {
    if (!selectedExercise) return 0;
    const calPer10min = selectedExercise.caloriesPer10Min || selectedExercise.caloriesPer10min || 50;
    const dur = parseFloat(duration) || 0;
    const s = parseInt(sets) || 1;
    return Math.round(((dur / 10) * calPer10min) * s);
  };

  // 💡 주간 통계 데이터를 기반으로 원 그래프 구성
  const chartData = {
    labels: weeklyLogs.length > 0 ? weeklyLogs.map(log => `${log.date || '운동일'} 기록`) : ['운동 안한 날 (휴식)'],
    datasets: [
      {
        data: weeklyLogs.length > 0 ? weeklyLogs.map(log => log.totalCalories || log.calories || 100) : [1],
        backgroundColor: ['#6c5ce7', '#a29bfe', '#fd79a8', '#fdcb6e', '#55efc4', '#74b9ff', '#e17055'],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            const index = context[0].dataIndex;
            if (weeklyLogs.length === 0) return '휴식 중';
            return `📅 날짜: ${weeklyLogs[index].date || '오늘'}`;
          },
          label: function(context) {
            if (weeklyLogs.length === 0) return ' 휴식 중 (운동 기록 없음)';
            const index = context.dataIndex;
            const log = weeklyLogs[index];
            const cal = log.totalCalories || log.calories || 0;
            return ` 🔥 소모 칼로리: ${cal} kcal`;
          }
        }
      }
    }
  };

  return (
    <div className="exercise-page">
      <h2 className="page-title">📊 본인의 운동 일정 및 상세 관리</h2>

      <div className="stats-container-card" style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '32px' }}>
        <h3>전체 주간 운동량 및 칼로리 소모량 (원 그래프)</h3>
        
        {weeklyLogs.length === 0 ? (
          <div className="default-chart-box" style={{ padding: '30px', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center', border: '2px dashed #ddd' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', color: '#555' }}>📈 이번 주 운동 데이터가 없습니다.</p>
            <span className="sub-text" style={{ color: '#888', fontSize: '14px' }}>차트 틀만 표시됩니다. 아래에서 운동을 기록해 보세요! (휴식 상태)</span>
          </div>
        ) : (
          <div style={{ maxWidth: '350px', margin: '0 auto', textAlign: 'center' }}>
            <Doughnut data={chartData} options={chartOptions} />
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
              💡 마우스를 그래프 위에 올리면 상세 소모 칼로리가 나타납니다.
            </p>
          </div>
        )}
      </div>

      <div className="search-record-section">
        <h3>운동 종류 및 상세 기록 추가</h3>
        <div className="search-section">
          <input 
            type="text" 
            className="search-input"
            placeholder="운동 검색 (예: 스쿼트, 벤치프레스)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch}>검색</button>
        </div>

        {searchResults.length > 0 && (
          <div className="result-list" style={{ marginTop: '16px' }}>
            {searchResults.map((ex) => (
              <div key={ex.id} className="exercise-item">
                <div>
                  <h4>{ex.name}</h4>
                  <p style={{ color: '#e17055', fontWeight: 'bold' }}>
                    {ex.category} | 🔥 10분당 소모 칼로리: {ex.caloriesPer10Min ?? ex.caloriesPer10min ?? 50} kcal
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
            
            <div style={{ background: '#fff3cd', padding: '12px', borderRadius: '6px', marginBottom: '16px', color: '#856404', fontWeight: 'bold' }}>
              ⚡ 예상 소모 칼로리: 약 {calculateEstimatedCalories()} kcal 소모 예정
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>운동 시간 (분)*</label>
                <input type="number" placeholder="예: 30" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>세트 수*</label>
                <input type="number" placeholder="예: 3" value={sets} onChange={(e) => setSets(e.target.value)} />
              </div>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>세트당 횟수 (Reps)</label>
                <input type="number" placeholder="예: 12" value={repsPerSet} onChange={(e) => setRepsPerSet(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>중량 (kg)</label>
                <input type="number" step="0.5" placeholder="예: 50" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
              </div>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>운동 강도</label>
                <select value={intensity} onChange={(e) => setIntensity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
                  <option value="LOW">약함</option>
                  <option value="MEDIUM">보통</option>
                  <option value="HIGH">강함</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>오늘의 컨디션</label>
                <select value={condition} onChange={(e) => setCondition(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px' }}>
                  <option value="GOOD">컨디션 최상</option>
                  <option value="NORMAL">보통</option>
                  <option value="BAD">피로함</option>
                  <option value="PAIN">통증/어지러움 있음 (주의)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '10px' }}>
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