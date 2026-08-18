import { useState, useEffect } from 'react';
import './DietManagement.css';
import axiosInstance from '../../api/axiosInstance'; 

const DietManagement = () => {
  const [keyword, setKeyword] = useState('');
  const [viewMode, setViewMode] = useState('DAILY'); 
  const [showVideo, setShowVideo] = useState(null); 
  
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 직접 입력 모달 상태 관리
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [recordForm, setRecordForm] = useState({
    mealType: '점심',
    foodName: '',
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axiosInstance.get('/diet/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error("대시보드 데이터를 불러오는데 실패했습니다.", error);
      setDashboardData(null); 
    } finally {
      setIsLoading(false);
    }
  };

  // 식단 직접 입력 백엔드 전송 로직
  const handleManualSubmit = async () => {
    if (!recordForm.foodName.trim()) {
      return alert("음식명을 입력해주세요!");
    }

    try {
      const formData = new FormData();
      formData.append('mealType', recordForm.mealType);
      formData.append('foodName', recordForm.foodName);
      formData.append('calories', recordForm.calories);
      formData.append('carbs', recordForm.carbs);
      formData.append('protein', recordForm.protein);
      formData.append('fat', recordForm.fat);

      await axiosInstance.post('/diet/record', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert("식단이 성공적으로 기록되었습니다!");
      setIsManualModalOpen(false); 
      setRecordForm({ mealType: '점심', foodName: '', calories: 0, carbs: 0, protein: 0, fat: 0 }); 
      
      fetchDashboardData(); 
      
    } catch (error) {
      console.error("식단 기록 실패:", error);
      alert("기록 중 오류가 발생했습니다.");
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setRecordForm(prev => ({
      ...prev,
      [name]: name === 'foodName' || name === 'mealType' ? value : Number(value)
    }));
  };

  const recipes = [
    { id: '1', videoId: 'e207Xq4A-08', title: '고단백 샐러드', tags: ['단백질 ↑', '저칼로리'] },
    { id: '2', videoId: '54zJ7D9Ept0', title: '저당 도시락', tags: ['저당', '포만감 ↑'] }
  ];
  const recentFoods = [
    { name: '현미밥', amount: '1공기 (210g)', kcal: 310 }
  ];
  const favoriteFoods = [
    { name: '아보카도 샐러드', amount: '1인분', kcal: 280 }
  ];

  const getStatusColor = (status) => {
    if (status === '부족') return 'orange';
    if (status === '과다') return 'red';
    return 'green';
  };

  const calcPercent = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  if (isLoading) return <div className="diet-web-container" style={{padding: '50px', textAlign: 'center'}}>데이터를 불러오는 중입니다...</div>;
  if (!dashboardData) return <div className="diet-web-container" style={{padding: '50px', textAlign: 'center'}}>목표 설정이 필요합니다.</div>;

  const {
    todayTotalCalories, targetCalories,
    todayCarbs, todayProtein, todayFat,
    hasAllergyWarning, registeredAllergies, warningFoodName, detectedAllergens,
    carbsDetail, proteinDetail, fatDetail, fiberDetail, calciumDetail, vitaminCDetail, sodiumDetail,
    targetWeight, todayRecords
  } = dashboardData;

  const caloriePercent = calcPercent(todayTotalCalories, targetCalories);

  return (
    <div className="diet-web-container">
      <header className="diet-header">
        <div className="header-title">
          <h2>식단 관리</h2>
          <p>알레르기와 영양을 함께 관리하세요.</p>
        </div>
        <div className="action-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="음식명 검색" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <button className="action-btn photo-btn">📷 사진 등록</button>
          <button className="action-btn manual-btn" onClick={() => setIsManualModalOpen(true)}>✏️ 직접 입력</button>
        </div>
      </header>

      <div className="diet-grid">
        <div className="left-panel">
          <div className="diet-card">
            <div className="card-header-flex">
              <h3>오늘 섭취 칼로리</h3>
              <span className="link-text">상세 보기 &gt;</span>
            </div>
            <div className="calorie-display">
              <span className="current-kcal">{todayTotalCalories.toLocaleString()} <span>kcal</span></span>
              <span className="target-kcal"> / 목표 {targetCalories.toLocaleString()} kcal</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-bg">
                <div className="progress-bar-fill blue" style={{ width: `${caloriePercent}%` }}></div>
              </div>
              <span className="percent-text">{caloriePercent}%</span>
            </div>
            
            <div className="macro-summary">
              <div className="macro-item">
                <span className="macro-label">탄수화물 {todayCarbs}g</span>
                <span className="macro-percent" style={{color: '#3498db'}}>{calcPercent(todayCarbs, carbsDetail.targetAmount)}%</span>
              </div>
              <div className="macro-item">
                <span className="macro-label">단백질 {todayProtein}g</span>
                <span className="macro-percent" style={{color: '#2ecc71'}}>{calcPercent(todayProtein, proteinDetail.targetAmount)}%</span>
              </div>
              <div className="macro-item">
                <span className="macro-label">지방 {todayFat}g</span>
                <span className="macro-percent" style={{color: '#95a5a6'}}>{calcPercent(todayFat, fatDetail.targetAmount)}%</span>
              </div>
            </div>
          </div>

          {hasAllergyWarning && (
            <div className="allergy-alert-card" style={{ borderColor: '#ff6b6b', background: '#fff5f5' }}>
              <div className="allergy-header">
                <span className="alert-icon">⚠️</span> <strong style={{color: '#e74c3c'}}>알레르기 주의</strong>
              </div>
              <div className="allergy-content">
                <div className="registered-allergy">
                  <span>등록된 알레르기</span>
                  <div className="tags">
                    {registeredAllergies.map((allergy, idx) => (
                      <span key={idx} className="tag red-tag">{allergy}</span>
                    ))}
                  </div>
                </div>
                <div className="detected-allergy">
                  <p>선택한 음식 : {warningFoodName}</p>
                  <div className="warning-msg" style={{color: '#e74c3c', fontWeight: 'bold'}}>
                    알레르기 유발 성분 포함: {detectedAllergens.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="diet-card">
            <div className="card-header-flex">
              <h3>오늘의 식단 기록</h3>
              <div className="view-mode-buttons">
                <button className={viewMode === 'DAILY' ? 'active' : ''} onClick={() => setViewMode('DAILY')}>일간</button>
                <button className={viewMode === 'WEEKLY' ? 'active' : ''} onClick={() => setViewMode('WEEKLY')}>주간</button>
                <button className={viewMode === 'MONTHLY' ? 'active' : ''} onClick={() => setViewMode('MONTHLY')}>월간</button>
              </div>
            </div>
            
            <div className="meal-logs-grid">
              {todayRecords && todayRecords.length > 0 ? (
                todayRecords.map(record => (
                  <div key={record.recordId} className="meal-box">
                    <div className="meal-title">🍽️ {record.mealType} <span>{record.time ? record.time.substring(0,5) : ''}</span></div>
                    <p className="meal-desc">{record.foodName}</p>
                    <div className="meal-kcal">{record.calories} <span>kcal</span></div>
                  </div>
                ))
              ) : (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '20px'}}>
                  오늘 기록된 식단이 없습니다. 상단의 '직접 입력'을 통해 식단을 기록해보세요!
                </div>
              )}
            </div>
          </div>

          <div className="diet-card">
            <div className="card-header-flex">
              <h3>다이어트 식단 레시피</h3>
              <span className="link-text">전체 보기 &gt;</span>
            </div>
            <div className="recipe-scroll">
              {recipes.map(recipe => (
                <div key={recipe.id} className="recipe-card" onClick={() => setShowVideo(recipe.videoId)}>
                  <div className="thumbnail-wrapper">
                    <img src={`https://img.youtube.com/vi/${recipe.videoId}/hqdefault.jpg`} alt={recipe.title} />
                    <div className="play-icon">▶</div>
                  </div>
                  <h4>{recipe.title}</h4>
                  <div className="recipe-tags">
                    {recipe.tags.map(tag => <span key={tag} className="tag blue-tag">{tag}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="diet-card">
            <h3>영양 섭취 요약</h3>
            <div className="nutrient-bars">
              <div className="nutrient-bar-row">
                <span className="n-label">탄수화물</span>
                <div className="n-bar-bg"><div className="n-bar-fill" style={{width: `${calcPercent(todayCarbs, carbsDetail.targetAmount)}%`, background: '#3498db'}}></div></div>
              </div>
              <div className="nutrient-bar-row">
                <span className="n-label">단백질</span>
                <div className="n-bar-bg"><div className="n-bar-fill" style={{width: `${calcPercent(todayProtein, proteinDetail.targetAmount)}%`, background: '#2ecc71'}}></div></div>
              </div>
              <div className="nutrient-bar-row">
                <span className="n-label">지방</span>
                <div className="n-bar-bg"><div className="n-bar-fill" style={{width: `${calcPercent(todayFat, fatDetail.targetAmount)}%`, background: '#95a5a6'}}></div></div>
              </div>
            </div>
            
            <hr className="divider"/>
            
            <div className="nutrient-details">
              <div className="detail-row"><span className={`dot ${getStatusColor(proteinDetail.status)}`}></span> 단백질 <span className="val">{proteinDetail.currentAmount} / {proteinDetail.targetAmount} g</span> <span className={`status ${getStatusColor(proteinDetail.status)}`}>{proteinDetail.status}</span></div>
              <div className="detail-row"><span className={`dot ${getStatusColor(fiberDetail.status)}`}></span> 식이섬유 <span className="val">{fiberDetail.currentAmount} / {fiberDetail.targetAmount} g</span> <span className={`status ${getStatusColor(fiberDetail.status)}`}>{fiberDetail.status}</span></div>
              <div className="detail-row"><span className={`dot ${getStatusColor(calciumDetail.status)}`}></span> 칼슘 <span className="val">{calciumDetail.currentAmount} / {calciumDetail.targetAmount} mg</span> <span className={`status ${getStatusColor(calciumDetail.status)}`}>{calciumDetail.status}</span></div>
              <div className="detail-row"><span className={`dot ${getStatusColor(vitaminCDetail.status)}`}></span> 비타민C <span className="val">{vitaminCDetail.currentAmount} / {vitaminCDetail.targetAmount} mg</span> <span className={`status ${getStatusColor(vitaminCDetail.status)}`}>{vitaminCDetail.status}</span></div>
              <div className="detail-row"><span className={`dot ${getStatusColor(sodiumDetail.status)}`}></span> 나트륨 <span className="val">{sodiumDetail.currentAmount} / {sodiumDetail.targetAmount} mg</span> <span className={`status ${getStatusColor(sodiumDetail.status)}`}>{sodiumDetail.status}</span></div>
            </div>
          </div>

          <div className="diet-card">
            <div className="card-header-flex">
              <h3>추천 영양 목표 (개인 맞춤)</h3>
              <span className="link-text">목표 설정 &gt;</span>
            </div>
            <div className="goals-grid">
              <div className="goal-item">
                <span className="goal-icon blue">⚖️</span>
                <span className="goal-label">목표 체중</span>
                <strong>{targetWeight} kg</strong>
              </div>
              <div className="goal-item">
                <span className="goal-icon orange">🔥</span>
                <span className="goal-label">권장 칼로리</span>
                <strong>{targetCalories.toLocaleString()} kcal</strong>
              </div>
              <div className="goal-item">
                <span className="goal-icon green">💪</span>
                <span className="goal-label">단백질 목표</span>
                <strong>{proteinDetail.targetAmount} g</strong>
              </div>
              <div className="goal-item">
                <span className="goal-icon green">🌿</span>
                <span className="goal-label">식이섬유</span>
                <strong>{fiberDetail.targetAmount} g</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showVideo && (
        <div className="video-modal-overlay" onClick={() => setShowVideo(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowVideo(null)}>X</button>
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${showVideo}?autoplay=1`} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen title="Diet Recipe"></iframe>
          </div>
        </div>
      )}

      {/* 직접 입력 모달창 (바깥 클릭 방지 및 탄수화물/지방 입력 포함) */}
      {isManualModalOpen && (
        <div className="video-modal-overlay">
          <div className="video-modal-content manual-modal" style={{background: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '400px', height: 'auto'}}>
            <h3 style={{marginTop: 0, marginBottom: '20px', color: '#0f172a'}}>식단 직접 입력</h3>
            
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>식사 타입</label>
              <select name="mealType" value={recordForm.mealType} onChange={handleFormChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1'}}>
                <option value="아침">아침</option>
                <option value="점심">점심</option>
                <option value="저녁">저녁</option>
                <option value="간식">간식</option>
              </select>
            </div>
            
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>음식 이름</label>
              <input type="text" name="foodName" value={recordForm.foodName} onChange={handleFormChange} placeholder="예: 닭가슴살 샐러드" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}/>
            </div>
            
            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
              <div style={{flex: 1}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>칼로리(kcal)</label>
                <input type="number" name="calories" value={recordForm.calories} onChange={handleFormChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}/>
              </div>
              <div style={{flex: 1}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>탄수화물(g)</label>
                <input type="number" name="carbs" value={recordForm.carbs} onChange={handleFormChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}/>
              </div>
            </div>

            <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
              <div style={{flex: 1}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>단백질(g)</label>
                <input type="number" name="protein" value={recordForm.protein} onChange={handleFormChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}/>
              </div>
              <div style={{flex: 1}}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 'bold'}}>지방(g)</label>
                <input type="number" name="fat" value={recordForm.fat} onChange={handleFormChange} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box'}}/>
              </div>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px'}}>
              <button onClick={() => setIsManualModalOpen(false)} style={{padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 'bold'}}>취소</button>
              <button onClick={handleManualSubmit} style={{padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', cursor: 'pointer', fontWeight: 'bold'}}>저장하기</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DietManagement;