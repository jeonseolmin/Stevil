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
  
  const [exerciseDate, setExerciseDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [sets, setSets] = useState('');
  const [repsPerSet, setRepsPerSet] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [memo, setMemo] = useState('');
  const [intensity, setIntensity] = useState('MEDIUM');
  const [condition, setCondition] = useState('NORMAL');
  
  const [inbodyWeight, setInbodyWeight] = useState('');
  const [inbodyMuscle, setInbodyMuscle] = useState('');
  const [inbodyFat, setInbodyFat] = useState('');

  const [currentWeight, setCurrentWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const [randomQuote, setRandomQuote] = useState('');

  const [exerciseStats, setExerciseStats] = useState([]);
  const [viewMode, setViewMode] = useState('WEEKLY'); 

  const [selectedSummaryDate, setSelectedSummaryDate] = useState(new Date().toISOString().split('T')[0]);

  const isAerobic = selectedExercise?.category?.includes('유산소');

  useEffect(() => {
    fetchStats();
    fetchUserInfo();

    const quotes = [
      "체지방 감소를 위해 '빠르게 걷기 30분' (유산소) 비중을 늘려보세요!",
      "기초대사량을 높이기 위해 근력 운동(무산소)을 10분만 추가해 보세요!",
      "운동 후 충분한 수분 섭취와 휴식은 근육 회복의 핵심입니다.",
      "오늘은 부상 방지를 위해 가벼운 스트레칭으로 시작해 보세요.",
      "꾸준함이 재능을 이깁니다. 오늘 하루도 수고하셨어요!"
    ];
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await axiosInstance.get('/users/1'); 
      setCurrentWeight(response.data.weight || 0);
      setTargetWeight(response.data.targetWeight || 0);
    } catch (error) {
      console.error("유저 정보 조회 실패", error);
      setCurrentWeight(72.5);
      setTargetWeight(68.0);
    }
  };

  const fetchStats = async () => {
    try {
      const userId = 1;
      const today = new Date();
      const startDay = new Date(today);
      startDay.setDate(today.getDate() - 30); 

      const endDate = today.toISOString().split('T')[0];
      const startDate = startDay.toISOString().split('T')[0];

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
    if (!duration) return alert("운동 시간을 입력해주세요!");
    if (!isAerobic && !sets) return alert("무산소 운동은 세트 수를 필수로 입력해야 합니다!");

    try {
      const recordData = {
        userId: 1,
        exerciseId: selectedExercise.id,
        exerciseDate: exerciseDate,
        durationMinutes: parseInt(duration),
        sets: isAerobic ? 1 : parseInt(sets),
        repsPerSet: isAerobic ? null : (repsPerSet ? parseInt(repsPerSet) : null),
        weightKg: isAerobic ? null : (weightKg ? parseFloat(weightKg) : null),
        memo: memo ? memo : null,
        intensityLevel: intensity,
        conditionStatus: condition,
        status: 'COMPLETED',
        inbodyWeight: inbodyWeight ? parseFloat(inbodyWeight) : null,
        inbodyMuscle: inbodyMuscle ? parseFloat(inbodyMuscle) : null,
        inbodyFat: inbodyFat ? parseFloat(inbodyFat) : null,
      };

      await axiosInstance.post('http://localhost:8080/api/exercise-logs', recordData);
      alert('운동 및 인바디 기록이 성공적으로 저장되었습니다!');
      
      setSelectedExercise(null);
      setKeyword('');
      setDuration(''); setSets(''); setRepsPerSet(''); setWeightKg(''); setMemo('');
      setInbodyWeight(''); setInbodyMuscle(''); setInbodyFat('');
      
      fetchStats(); 
      fetchUserInfo(); 
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

  const getFilteredChartStats = () => {
    if (viewMode === 'DAILY') {
      return exerciseStats.filter(log => (log.exerciseDate || log.date) === selectedSummaryDate);
    } else if (viewMode === 'WEEKLY') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      return exerciseStats.filter(log => {
        const d = log.exerciseDate || log.date;
        return d >= weekAgoStr && d <= todayStr;
      });
    }
    return exerciseStats; // MONTHLY
  };

  const chartStats = getFilteredChartStats();

  const getChartDateRangeText = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    if (viewMode === 'DAILY') {
      return `${selectedSummaryDate}`; // 선택된 날짜 출력!
    } else if (viewMode === 'WEEKLY') {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      return `${weekAgo.toISOString().split('T')[0]} ~ ${todayStr}`;
    } else {
      const monthAgo = new Date();
      monthAgo.setDate(today.getDate() - 30);
      return `${monthAgo.toISOString().split('T')[0]} ~ ${todayStr}`;
    }
  };
  const dateRangeText = getChartDateRangeText();

  const categoryTotals = chartStats.reduce((acc, log) => {
    const cat = log.category || '미분류 운동'; 
    const cal = log.burnedCalories || log.totalCalories || log.calories || 0;
    acc[cat] = (acc[cat] || 0) + cal;
    return acc;
  }, {});

  const chartLabels = Object.keys(categoryTotals);
  const chartDataValues = Object.values(categoryTotals);

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['운동 안한 날 (휴식)'],
    datasets: [{
      data: chartLabels.length > 0 ? chartDataValues : [1],
      backgroundColor: ['#1abc9c', '#41d9ff', '#fdcb6e', '#3b82f6'],
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          title: (context) => chartLabels.length > 0 ? `분류: ${context[0].label}` : '휴식 중',
          label: (context) => chartLabels.length > 0 ? `소모: ${context.raw} kcal` : ' 기록 없음'
        }
      }
    }
  };

  const dailyLogs = exerciseStats.filter(log => (log.exerciseDate || log.date) === selectedSummaryDate);
  const dailyCalories = dailyLogs.reduce((sum, log) => sum + (log.burnedCalories || log.calories || 0), 0);
  const dailyDuration = dailyLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
  const dailySets = dailyLogs.reduce((sum, log) => sum + (log.sets || 0), 0);

  const generateDateStrip = () => {
    const dates = [];
    const baseDate = new Date(selectedSummaryDate);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    
    for (let i = -3; i <= 3; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push({
        fullDate: d.toISOString().split('T')[0],
        dateNum: d.getDate(),
        dayStr: dayNames[d.getDay()]
      });
    }
    return dates;
  };

  return (
    <div className="exercise-web-container">
      
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="main-title">내 운동 다이어리</h1>
          <p className="sub-title">오늘의 운동과 신체 변화를 기록하고 관리하세요.</p>
        </div>
        <div className="goal-banner">
          <div className="goal-info">
            <span className="goal-badge">현재 목표</span>
            <h3>{targetWeight}kg 감량</h3>
            <p>현재 체중: {currentWeight}kg (남은 목표: {(currentWeight - targetWeight).toFixed(1)}kg)</p>
          </div>
          <div className="recommendation-box">
            <h4>💡 AI 맞춤 추천</h4>
            <p>{randomQuote}</p>
          </div>
        </div>
      </header>

      <section className="daily-overview-section">
        <div className="calendar-strip">
          <button className="nav-btn" onClick={() => {
            const d = new Date(selectedSummaryDate);
            d.setDate(d.getDate() - 1);
            setSelectedSummaryDate(d.toISOString().split('T')[0]);
            setViewMode('DAILY'); 
          }}>&lt;</button>
          <div className="dates-container">
            {generateDateStrip().map((d) => (
              <div 
                key={d.fullDate} 
                className={`date-item ${d.fullDate === selectedSummaryDate ? 'active' : ''}`}
                onClick={() => {
                  setSelectedSummaryDate(d.fullDate);
                  setViewMode('DAILY'); 
                }}
              >
                <span className="d-num">{d.dateNum}</span>
                <span className="d-str">{d.dayStr}</span>
              </div>
            ))}
          </div>
          <button className="nav-btn" onClick={() => {
            const d = new Date(selectedSummaryDate);
            d.setDate(d.getDate() + 1);
            setSelectedSummaryDate(d.toISOString().split('T')[0]);
            setViewMode('DAILY');
          }}>&gt;</button>
        </div>

        <div className="daily-summary-header">
          <h3>선택한 날짜의 운동 요약 ({selectedSummaryDate})</h3>
        </div>

        <div className="daily-summary-grid">
          <div className="summary-card">
            <div className="sum-title"><span style={{color: '#1abc9c'}}></span> 소모 칼로리</div>
            <div className="sum-value">{dailyCalories} <span>kcal</span></div>
            <div className="progress-bar"><div className="fill" style={{width: `${Math.min(dailyCalories/500 * 100, 100)}%`, background: '#1abc9c'}}></div></div>
          </div>
          <div className="summary-card">
            <div className="sum-title"><span style={{color: '#3b82f6'}}></span> 운동 시간</div>
            <div className="sum-value">{dailyDuration} <span>분</span></div>
            <div className="progress-bar"><div className="fill" style={{width: `${Math.min(dailyDuration/60 * 100, 100)}%`, background: '#3b82f6'}}></div></div>
          </div>
          <div className="summary-card">
            <div className="sum-title"><span style={{color: '#9b59b6'}}></span> 총 수행 세트</div>
            <div className="sum-value">{dailySets} <span>세트</span></div>
            <div className="progress-bar"><div className="fill" style={{width: `${Math.min(dailySets/20 * 100, 100)}%`, background: '#9b59b6'}}></div></div>
          </div>
          <div className="summary-card">
            <div className="sum-title"><span style={{color: '#f39c12'}}></span> 남은 목표 체중</div>
            <div className="sum-value">{(currentWeight - targetWeight).toFixed(1)} <span>kg</span></div>
            <div className="progress-bar"><div className="fill" style={{width: '70%', background: '#f39c12'}}></div></div>
          </div>
        </div>

        <div className="daily-record-list-container">
          <div className="record-list-header">
            <h4>운동 기록</h4>
            <span className="more-btn">더보기 &gt;</span>
          </div>
          
          {dailyLogs.length === 0 ? (
            <div className="empty-record-text">이 날짜에 기록된 운동이 없습니다.</div>
          ) : (
            <div className="record-list-body">
              {dailyLogs.map((log, idx) => (
                <div key={idx} className="daily-record-item">
                  <div className="item-left">
                    <div className="item-icon" style={{ background: log.category?.includes('유산소') ? '#e0f2f1' : '#f3e5f5' }}>
                      {log.category?.includes('유산소') ? '🏃' : '🏋️‍♂️'}
                    </div>
                    <div className="item-info">
                      <div className="item-name">{log.exerciseName || '운동'}</div>
                      <div className="item-date">{selectedSummaryDate}</div>
                    </div>
                  </div>
                  
                  <div className="item-center">
                    <div className="val-box">{log.durationMinutes || 0} 분</div>
                    <div className="val-box">{log.burnedCalories || 0} kcal</div>
                    <div className="val-box">{log.sets ? `${log.sets} 세트` : '—'}</div>
                  </div>
                  
                  <div className="item-right">
                    &gt;
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="left-panel">
          <div className="card">
            <div className="card-header">
              <h3>전체 운동량 (유산소 vs 무산소)</h3>
              <div className="view-mode-buttons">
                <button className={viewMode === 'DAILY' ? 'active' : ''} onClick={() => setViewMode('DAILY')}>일간</button>
                <button className={viewMode === 'WEEKLY' ? 'active' : ''} onClick={() => setViewMode('WEEKLY')}>주간</button>
                <button className={viewMode === 'MONTHLY' ? 'active' : ''} onClick={() => setViewMode('MONTHLY')}>월간</button>
              </div>
            </div>
            
            <p className="date-range">{dateRangeText}</p>

            {chartStats.length === 0 ? (
              <div className="empty-chart">
                <p>선택한 기간의 운동 데이터가 없습니다.</p>
              </div>
            ) : (
              <div className="chart-wrapper">
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="card">
            <h3>운동 검색 및 새로운 기록</h3>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="운동 검색 (예: 벤치프레스, 걷기)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>검색</button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((ex) => (
                  <div key={ex.id} className="result-item">
                    <div>
                      <strong>{ex.name}</strong>
                      <span>{ex.category} | 10분당 {ex.caloriesPer10Min ?? 50} kcal</span>
                    </div>
                    <button onClick={() => setSelectedExercise(ex)}>선택</button>
                  </div>
                ))}
              </div>
            )}

            {selectedExercise && (
              <div className="record-form">
                <div className="form-header">
                  <h4>[{selectedExercise.name}] 기록 작성</h4>
                  <div className="calorie-badge">{calculateEstimatedCalories()} kcal 소모 예정</div>
                </div>

                <div className="input-group">
                  <label> 운동 일정 (날짜)</label>
                  <input type="date" value={exerciseDate} onChange={(e) => setExerciseDate(e.target.value)} />
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>운동 시간 (분)*</label>
                    <input type="number" placeholder="예: 30" value={duration} onChange={(e) => setDuration(e.target.value)} />
                  </div>
                  {!isAerobic && (
                    <div className="input-group">
                      <label>세트 수*</label>
                      <input type="number" placeholder="예: 3" value={sets} onChange={(e) => setSets(e.target.value)} />
                    </div>
                  )}
                </div>

                {!isAerobic && (
                  <div className="form-row">
                    <div className="input-group">
                      <label>세트당 횟수</label>
                      <input type="number" placeholder="예: 12" value={repsPerSet} onChange={(e) => setRepsPerSet(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>중량 (kg)</label>
                      <input type="number" step="0.5" placeholder="예: 50" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                    </div>
                  </div>
                )}

                <hr className="divider" />
                <h5 className="section-subtitle">인바디 및 컨디션 기록</h5>
                
                <div className="form-row">
                  <div className="input-group">
                    <label>측정 체중 (kg)</label>
                    <input type="number" step="0.1" placeholder={`기존: ${currentWeight}kg`} value={inbodyWeight} onChange={(e) => setInbodyWeight(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>골격근량 (kg)</label>
                    <input type="number" step="0.1" placeholder="예: 32.1" value={inbodyMuscle} onChange={(e) => setInbodyMuscle(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>체지방률 (%)</label>
                    <input type="number" step="0.1" placeholder="예: 18.5" value={inbodyFat} onChange={(e) => setInbodyFat(e.target.value)} />
                  </div>
                </div>

                <div className="input-group">
                  <label>운동 내용 및 특이사항 (메모)</label>
                  <input type="text" placeholder="예: 스쿼트 시 무릎 통증 약간 있음" value={memo} onChange={(e) => setMemo(e.target.value)} />
                </div>

                <button className="submit-btn" onClick={handleSaveRecord}>일정 및 기록 저장하기</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseManagement;