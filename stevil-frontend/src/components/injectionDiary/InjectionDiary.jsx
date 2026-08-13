import { useState, useEffect } from 'react';
import './InjectionDiary.css';
import axiosInstance from '../../api/axiosInstance';

const InjectionDiary = () => {
  const [viewMode, setViewMode] = useState('RECORD');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [dosage, setDosage] = useState('');
  const [injectionSite, setInjectionSite] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [lifestyleMemo, setLifestyleMemo] = useState('');

  const [recentLogs, setRecentLogs] = useState([]);

  const symptomTags = [
    { id: 'none', label: '증상 없음' },
    { id: 'nausea', label: '메스꺼움' },
    { id: 'headache', label: '두통' },
    { id: 'fatigue', label: '무기력/피로' },
    { id: 'indigestion', label: '소화불량' },
    { id: 'dizziness', label: '어지러움' },
    { id: 'palpitation', label: '심박수 증가' },
    { id: 'etc', label: '기타' }

  ];

  // 컴포넌트 마운트 시 최근 기록 조회
  useEffect(() => {
    fetchLogs();
  }, []);

  // 1. GET: 백엔드에서 최근 기록 불러오기
  const fetchLogs = async () => {
    try {
      const response = await axiosInstance.get(`http://localhost:8080/api/injections/recent`);
      
      if (Array.isArray(response.data)) {
        setRecentLogs(response.data);
      } else {
        setRecentLogs([]); 
      }
    } catch (error) {
      console.error("기록 조회 실패:", error);
      setRecentLogs([]); 
    }
  };

  // 증상 태그 선택 토글 함수
  const toggleSymptom = (label) => {
    if (selectedSymptoms.includes(label)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== label));
    } else {
      setSelectedSymptoms([...selectedSymptoms, label]);
    }
  };

  // 2. POST: 백엔드에 새로운 주사 일기 저장하기
  const handleSave = async () => {
    if (!dosage || !injectionSite) {
      alert('투여 용량과 부위를 입력해주세요.');
      return;
    }

    try {
      const payload = {
        recordDate: recordDate,
        dosage: parseFloat(dosage),
        injectionSite: injectionSite,
        symptoms: selectedSymptoms,
        lifestyleMemo: lifestyleMemo
      };

      await axiosInstance.post(`http://localhost:8080/api/injections`, payload);
      
      alert('오늘의 주사 일기가 성공적으로 저장되었습니다!');
      
      setDosage(''); 
      setInjectionSite(''); 
      setSelectedSymptoms([]); 
      setLifestyleMemo('');
      fetchLogs();
    } catch (error) {
      console.error("저장 실패:", error);
      alert("기록 저장에 실패했습니다.");
    }
  };

  // 리포트 상단 요약 통계 계산 (최신 기록 기준)
  const currentDosage = recentLogs.length > 0 ? recentLogs[0].dosage : 0;
  
  // 가장 많이 나타난 증상 찾기
  const getMostFrequentSymptom = () => {
    if (recentLogs.length === 0) return '없음';
    const counts = {};
    recentLogs.forEach(log => {
      if (log.symptoms) {
        log.symptoms.forEach(sym => {
          counts[sym] = (counts[sym] || 0) + 1;
        });
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0].replace(/[^가-힣a-zA-Z]/g, '').trim() : '없음';
  };

  return (
    <div className="medical-web-container">
      
      {/* 상단 헤더 */}
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="main-title">주사 및 컨디션 일기</h1>
          <p className="sub-title">투여 기록과 증상을 메모하여 진료 시 담당 의사에게 보여주세요.</p>
        </div>
        
        {/* 모드 전환 토글 */}
        <div className="mode-toggle">
          <button 
            className={`toggle-btn ${viewMode === 'RECORD' ? 'active' : ''}`}
            onClick={() => setViewMode('RECORD')}
          >
            오늘의 기록
          </button>
          <button 
            className={`toggle-btn report-btn ${viewMode === 'REPORT' ? 'active' : ''}`}
            onClick={() => setViewMode('REPORT')}
          >
            의사 전달 리포트
          </button>
        </div>
      </header>

      {viewMode === 'RECORD' ? (
        /* 1. 환자 기록 모드 (RECORD) */
        <div className="dashboard-grid">
          <div className="left-panel">
            <div className="card">
              <h3>오늘의 투여 및 컨디션 기록</h3>
              
              <div className="form-group">
                <label>기록 날짜</label>
                <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>투여 용량 (mg/ml)</label>
                  <input type="number" step="0.1" placeholder="예: 0.6" value={dosage} onChange={(e) => setDosage(e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>주사 부위</label>
                  <select value={injectionSite} onChange={(e) => setInjectionSite(e.target.value)}>
                    <option value="">부위 선택</option>
                    <option value="좌측 복부">좌측 복부</option>
                    <option value="우측 복부">우측 복부</option>
                    <option value="좌측 허벅지">좌측 허벅지</option>
                    <option value="우측 허벅지">우측 허벅지</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
              </div>

              <hr className="divider" />

              <div className="form-group">
                <label>🩺 오늘의 주요 증상 (다중 선택 가능)</label>
                <div className="symptom-tags-container">
                  {symptomTags.map(tag => (
                    <button
                      key={tag.id}
                      className={`symptom-tag ${selectedSymptoms.includes(tag.label) ? 'selected' : ''}`}
                      onClick={() => toggleSymptom(tag.label)}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>식단 / 운동 / 특이사항 메모 (의사 전달용)</label>
                <textarea 
                  className="memo-textarea" 
                  placeholder="예: 어제보다 식욕이 많이 떨어졌고, 저녁에 스쿼트 3세트 후 약간 어지러움이 있었습니다."
                  value={lifestyleMemo}
                  onChange={(e) => setLifestyleMemo(e.target.value)}
                ></textarea>
              </div>

              <button className="submit-btn" onClick={handleSave}>기록 저장하기</button>
            </div>
          </div>

          <div className="right-panel">
            <div className="info-banner">
              <span className="info-icon">💡</span>
              <div>
                <h4>올바른 주사 부위 순환</h4>
                <p>피부 손상을 막기 위해 주사 부위는 매일 번갈아가며 투여하는 것이 좋습니다. (예: 좌측 복부 → 우측 복부)</p>
              </div>
            </div>

            <div className="card mt-20">
              <h3>최근 나의 컨디션 흐름</h3>
              <div className="mini-timeline">
                {recentLogs.length === 0 ? (
                  <p style={{color: '#888', fontSize: '14px'}}>아직 기록된 주사 일기가 없습니다.</p>
                ) : (
                  recentLogs.slice(0, 5).map((log, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-date">{log.recordDate ? log.recordDate.substring(5) : ''}</div>
                      <div className="timeline-content">
                        <div className="tl-dose">용량: {log.dosage}mg (부위: {log.injectionSite})</div>
                        <div className="tl-symptoms">
                          {log.symptoms && log.symptoms.length > 0 ? log.symptoms.join(', ') : '특이사항 없음'}
                        </div>
                        {log.lifestyleMemo && (
                          <div className="tl-memo">
                            {log.lifestyleMemo}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="report-mode-container">
          <div className="report-header">
            <h2>진료 참고용 환자 리포트</h2>
            <button className="print-btn" onClick={() => window.print()}>인쇄/PDF 저장</button>
          </div>

          <div className="report-summary-cards">
            <div className="r-card">
              <div className="r-card-title">현재 투여 용량</div>
              <div className="r-card-value blue-text">{currentDosage} <span>mg</span></div>
            </div>
            <div className="r-card">
              <div className="r-card-title">가장 잦은 증상</div>
              <div className="r-card-value red-text">{getMostFrequentSymptom()}</div>
            </div>
            <div className="r-card">
              <div className="r-card-title">기록된 총 일수</div>
              <div className="r-card-value green-text">{recentLogs.length} <span>일</span></div>
            </div>
          </div>

          <div className="card report-table-card">
            <h3>전체 상세 기록</h3>
            {recentLogs.length === 0 ? (
              <p style={{textAlign: 'center', padding: '30px', color: '#888'}}>기록된 데이터가 없습니다.</p>
            ) : (
              <table className="doctor-report-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>투여량</th>
                    <th>주사 부위</th>
                    <th>발현 증상</th>
                    <th>환자 메모 (식단/운동/컨디션)</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.recordDate}</td>
                      <td className="fw-bold">{log.dosage}mg</td>
                      <td>{log.injectionSite}</td>
                      <td className="symptom-cell">
                        {log.symptoms && log.symptoms.length > 0 
                          ? log.symptoms.map((s, i) => <span key={i} className="r-tag">{s}</span>)
                          : <span className="r-tag gray">없음</span>
                        }
                      </td>
                      <td className="memo-cell">{log.lifestyleMemo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InjectionDiary;