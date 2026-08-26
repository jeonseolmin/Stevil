import { useState, useEffect } from 'react';
import './DietManagement.css';
import axiosInstance from '../../api/axiosInstance'; 

const DietManagement = () => {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [viewMode, setViewMode] = useState('DAILY'); 
  
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [recordForm, setRecordForm] = useState({
    mealType: '점심',
    foodName: '',
    calories: 0,
    carbs: 0,
    protein: 0,
    fat: 0
  });

  const [activeVideoId, setActiveVideoId] = useState(null);

  const dietRecipes = [
    {
      id: 1,
      title: '단백질 폭탄 닭가슴살 볶음밥 레시피',
      channel: '헬스요리사',
      videoId: 'dQw4w9WgXcQ',
    },
    {
      id: 2,
      title: '다이어트 클린 식단: 아보카도 연어 샐러드',
      channel: '슬림키친',
      videoId: '3JZ_D3ELwOQ',
    }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword.trim()) {
        fetchFoodSearchAPI(keyword);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [keyword]);

  const parseFoodData = (item) => {
    const parseNum = (val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.round(num); 
    };

    return {
      name: item.DESC_KOR || item.desc_kor || item.FOOD_NM_KR || item.food_nm_kr || '이름 없음',
      kcal: parseNum(item.NUTR_CONT1 || item.nutr_cont1 || item.AMT_NUM1),
      carbs: parseNum(item.NUTR_CONT2 || item.nutr_cont2 || item.AMT_NUM7), 
      protein: parseNum(item.NUTR_CONT3 || item.nutr_cont3 || item.AMT_NUM3),
      fat: parseNum(item.NUTR_CONT4 || item.nutr_cont4 || item.AMT_NUM4),
      servingSize: item.SERVING_WT || item.serving_wt || item.SERVING_SIZE || item.serving_size || '100', 
    };
  };

  const fetchFoodSearchAPI = async (searchWord) => {
    setIsSearching(true);
    try {
      const response = await axiosInstance.get(`/diet/food/search?keyword=${searchWord}`);
      
      let data = response.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) {}
      }
      
      console.log("✅ 백엔드에서 넘어온 API 원본 데이터:", data);

      let items = [];
      if (data?.body?.items) {
        items = Array.isArray(data.body.items) ? data.body.items : (data.body.items.item || []);
      }
      
      setSearchResults(items);
    } catch (error) {
      console.error("음식 검색 실패", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchedFood = (foodData) => {
    const parsed = parseFoodData(foodData); // 💡 파싱 함수 거치기

    setRecordForm({
      mealType: '점심',
      foodName: parsed.name,
      calories: Number(parsed.kcal) || 0,
      carbs: Number(parsed.carbs) || 0,    
      protein: Number(parsed.protein) || 0,  
      fat: Number(parsed.fat) || 0       
    });
    
    setKeyword('');
    setSearchResults([]);
    setIsManualModalOpen(true); 
  };

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

  const handleCloseManualModal = () => {
    setIsManualModalOpen(false);
    setRecordForm({
      mealType: '점심',
      foodName: '',
      calories: 0,
      carbs: 0,
      protein: 0,
      fat: 0
    });
  };

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
      handleCloseManualModal(); 
      fetchDashboardData(); 
      
    } catch (error) {
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

  const getStatusColor = (status) => {
    if (status === '부족') return 'orange';
    if (status === '과다') return 'red';
    return 'green';
  };

  const calcPercent = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  };

  if (isLoading) return <div className="diet-page"><div className="diet-container" style={{textAlign: 'center', padding: '100px 0'}}>데이터를 불러오는 중입니다...</div></div>;
  if (!dashboardData) return <div className="diet-page"><div className="diet-container" style={{textAlign: 'center', padding: '100px 0'}}>목표 설정이 필요합니다.</div></div>;

  const {
    todayTotalCalories, targetCalories,
    todayCarbs, todayProtein, todayFat,
    hasAllergyWarning, registeredAllergies, warningFoodName, detectedAllergens,
    carbsDetail, proteinDetail, fatDetail,
    targetWeight, todayRecords
  } = dashboardData;

  const caloriePercent = calcPercent(todayTotalCalories, targetCalories);

  return (
    <div className="diet-page">
      <div className="diet-container">
        
        <header className="diet-header">
          <div>
            <h1>식단 관리</h1>
            <p>알레르기와 영양을 함께 관리하세요.</p>
          </div>
          <div className="diet-action-bar">
            
            <div className="diet-search-wrapper" style={{ position: 'relative' }}>
              <span className="diet-search-icon">🔍</span>
              <input 
                type="text" 
                placeholder="음식명 검색 (예: 닭가슴살)" 
                value={keyword} 
                onChange={(e) => setKeyword(e.target.value)} 
              />
              
              {isSearching && (
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#0ea5e9', fontWeight: 'bold' }}>
                  검색중...
                </span>
              )}

              {/* 검색 결과 드롭다운 */}
              {searchResults.length > 0 && (
                <ul style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', 
                    border: '1px solid #cbd5e1', borderRadius: '8px', maxHeight: '250px', 
                    overflowY: 'auto', zIndex: 100, listStyle: 'none', padding: 0, margin: '4px 0 0 0', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' 
                }}>
                  {searchResults.map((item, idx) => {
                      const parsed = parseFoodData(item); 

                        return (
                          <li 
                          key={idx} 
                            onClick={() => handleSelectSearchedFood(item)}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                            style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '4px' }}
                          >
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{parsed.name}</strong>
                    <span style={{ color: '#64748b', fontSize: '12px' }}>
                      <strong style={{color: '#0ea5e9'}}>[{parsed.servingSize} 기준]</strong> {parsed.kcal}kcal | 탄: {parsed.carbs}g · 단: {parsed.protein}g · 지: {parsed.fat}g
                    </span>
                  </li>
                  );
              })}
            </ul>
            )}
            </div>

            <button className="diet-btn diet-btn--secondary">사진 등록</button>
            <button className="diet-btn diet-btn--primary" onClick={() => setIsManualModalOpen(true)}>직접 입력</button>
          </div>
        </header>

        <div className="diet-grid">
          
          <div className="diet-left-panel">
            
            <div className="diet-card">
              <div className="diet-card-header">
                <h3>오늘 섭취 칼로리</h3>
                <span className="diet-text-btn" onClick={() => setIsDetailModalOpen(true)}>상세 보기 &gt;</span>
              </div>
              <div className="diet-calorie-display">
                <span className="diet-current-kcal">{todayTotalCalories.toLocaleString()} <span>kcal</span></span>
                <span className="diet-target-kcal">/ 목표 {targetCalories.toLocaleString()} kcal</span>
              </div>
              <div className="diet-progress-track">
                <span className="diet-progress-bar" style={{ width: `${caloriePercent}%` }}></span>
              </div>
              
              <div className="diet-macro-summary">
                <div className="diet-macro-item">
                  <span className="diet-macro-label">탄수화물 {todayCarbs}g</span>
                  <span className="diet-macro-percent">{calcPercent(todayCarbs, carbsDetail.targetAmount)}%</span>
                </div>
                <div className="diet-macro-item">
                  <span className="diet-macro-label">단백질 {todayProtein}g</span>
                  <span className="diet-macro-percent">{calcPercent(todayProtein, proteinDetail.targetAmount)}%</span>
                </div>
                <div className="diet-macro-item">
                  <span className="diet-macro-label">지방 {todayFat}g</span>
                  <span className="diet-macro-percent">{calcPercent(todayFat, fatDetail.targetAmount)}%</span>
                </div>
              </div>
            </div>

            {hasAllergyWarning && (
              <div className="diet-allergy-card">
                <strong style={{color: '#ef4444', display: 'block', marginBottom: '10px', fontSize: '16px'}}>알레르기 주의</strong>
                <p style={{margin: '0 0 8px 0', fontSize: '14px', color: '#374151'}}>선택한 음식: <strong>{warningFoodName}</strong></p>
                <div style={{color: '#ef4444', fontWeight: '800', fontSize: '14px'}}>
                  위험 성분 포함: {detectedAllergens.join(', ')}
                </div>
              </div>
            )}

            <div className="diet-card">
              <div className="diet-card-header">
                <h3>오늘의 식단 기록</h3>
                <div className="diet-view-mode-btns">
                  <button className={viewMode === 'DAILY' ? 'active' : ''} onClick={() => setViewMode('DAILY')}>일간</button>
                  <button className={viewMode === 'WEEKLY' ? 'active' : ''} onClick={() => setViewMode('WEEKLY')}>주간</button>
                  <button className={viewMode === 'MONTHLY' ? 'active' : ''} onClick={() => setViewMode('MONTHLY')}>월간</button>
                </div>
              </div>
              
              <div className="diet-meal-grid">
                {todayRecords && todayRecords.length > 0 ? (
                  todayRecords.map(record => (
                    <div key={record.recordId} className="diet-meal-box">
                      <div className="diet-meal-title">
                        <span className="diet-meal-badge">{record.mealType}</span> 
                        <span className="diet-meal-time">{record.time ? record.time.substring(0,5) : ''}</span>
                      </div>
                      <p className="diet-meal-desc">{record.foodName}</p>
                      <div className="diet-meal-kcal">{record.calories} <span>kcal</span></div>
                    </div>
                  ))
                ) : (
                  <div style={{gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-muted)', padding: '30px 0', fontSize: '14px'}}>
                    오늘 기록된 식단이 없습니다.<br/>상단의 '직접 입력'을 통해 식단을 기록해보세요.
                  </div>
                )}
              </div>
            </div>

            <div className="diet-card">
              <div className="diet-card-header">
                <h3>다이어트 식단 레시피</h3>
                <span className="diet-text-btn">전체 보기 &gt;</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {dietRecipes.map(recipe => (
                  <div 
                    key={recipe.id} 
                    onClick={() => setActiveVideoId(recipe.videoId)}
                    style={{ cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface-soft)', transition: 'transform 160ms ease' }}
                  >
                    <div style={{ position: 'relative', width: '100%', height: '130px', background: '#000' }}>
                      <img 
                        src={`https://img.youtube.com/vi/${recipe.videoId}/hqdefault.jpg`} 
                        alt={recipe.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                      />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '14px', paddingLeft: '2px', boxShadow: 'var(--shadow-small)' }}>
                          ▶
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '14px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '800', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.title}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: '600' }}>{recipe.channel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="diet-right-panel">
            
            <div className="diet-card">
              <h3>영양 섭취 요약</h3>
              <div className="diet-nutrient-bars">
                <div className="diet-nutrient-row">
                  <span className="diet-n-label">탄수화물</span>
                  <div className="diet-n-bar-bg"><span className="diet-n-bar-fill" style={{width: `${calcPercent(todayCarbs, carbsDetail.targetAmount)}%`}}></span></div>
                </div>
                <div className="diet-nutrient-row">
                  <span className="diet-n-label">단백질</span>
                  <div className="diet-n-bar-bg"><span className="diet-n-bar-fill" style={{width: `${calcPercent(todayProtein, proteinDetail.targetAmount)}%`}}></span></div>
                </div>
                <div className="diet-nutrient-row">
                  <span className="diet-n-label">지방</span>
                  <div className="diet-n-bar-bg"><span className="diet-n-bar-fill" style={{width: `${calcPercent(todayFat, fatDetail.targetAmount)}%`}}></span></div>
                </div>
              </div>
              
              <hr className="divider" style={{border: 'none', borderTop: '1px dashed var(--color-border)', margin: '24px 0'}}/>
              
              <div className="diet-nutrient-details">
                <div className="diet-detail-row">
                  <div className="diet-detail-label"><span className={`diet-dot ${getStatusColor(carbsDetail.status)}`}></span> 탄수화물</div>
                  <span className="diet-val">{carbsDetail.currentAmount} / {carbsDetail.targetAmount} g</span> 
                  <span className={`diet-status ${getStatusColor(carbsDetail.status)}`}>{carbsDetail.status}</span>
                </div>
                <div className="diet-detail-row">
                  <div className="diet-detail-label"><span className={`diet-dot ${getStatusColor(proteinDetail.status)}`}></span> 단백질</div>
                  <span className="diet-val">{proteinDetail.currentAmount} / {proteinDetail.targetAmount} g</span> 
                  <span className={`diet-status ${getStatusColor(proteinDetail.status)}`}>{proteinDetail.status}</span>
                </div>
                <div className="diet-detail-row">
                  <div className="diet-detail-label"><span className={`diet-dot ${getStatusColor(fatDetail.status)}`}></span> 지방</div>
                  <span className="diet-val">{fatDetail.currentAmount} / {fatDetail.targetAmount} g</span> 
                  <span className={`diet-status ${getStatusColor(fatDetail.status)}`}>{fatDetail.status}</span>
                </div>
              </div>
            </div>

            <div className="diet-card">
              <div className="diet-card-header">
                <h3>추천 영양 목표</h3>
                <span className="diet-text-btn">목표 설정 &gt;</span>
              </div>
              <div className="diet-goals-grid">
                <div className="diet-goal-card">
                  <span className="diet-goal-label">목표 체중</span>
                  <strong>{targetWeight} kg</strong>
                </div>
                <div className="diet-goal-card">
                  <span className="diet-goal-label">권장 칼로리</span>
                  <strong>{targetCalories.toLocaleString()} kcal</strong>
                </div>
                <div className="diet-goal-card">
                  <span className="diet-goal-label">탄수화물 목표</span>
                  <strong>{carbsDetail.targetAmount} g</strong>
                </div>
                <div className="diet-goal-card">
                  <span className="diet-goal-label">단백질 목표</span>
                  <strong>{proteinDetail.targetAmount} g</strong>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {isDetailModalOpen && (
        <div className="diet-modal-bg" onClick={() => setIsDetailModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="diet-modal-box">
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: '800' }}>칼로리 섭취 상세 분석</h3>
            <div style={{ background: 'var(--color-surface-soft)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>오늘 총 섭취량</span>
                <strong style={{ color: 'var(--color-primary)' }}>{todayTotalCalories.toLocaleString()} kcal</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>일일 권장 목표</span>
                <strong>{targetCalories.toLocaleString()} kcal</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: '600' }}>달성률</span>
                <strong style={{ color: caloriePercent > 100 ? '#ef4444' : 'var(--color-primary)' }}>{caloriePercent}%</strong>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
              {caloriePercent > 100 
                ? '목표 칼로리를 초과하셨습니다. 남은 하루는 가벼운 산책이나 유산소 운동을 추천합니다.' 
                : '목표 칼로리 범위 내에서 건강하게 영양분을 섭취하고 계십니다. 이대로 유지해 보세요!'}
            </p>
            <button onClick={() => setIsDetailModalOpen(false)} className="diet-btn diet-btn--primary" style={{ width: '100%', padding: '12px' }}>
              확인
            </button>
          </div>
        </div>
      )}

      {activeVideoId && (
        <div className="diet-modal-bg" onClick={() => setActiveVideoId(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', width: '800px', maxWidth: '90%', position: 'relative', boxShadow: 'var(--shadow-medium)' }}>
            <button onClick={() => setActiveVideoId(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', zIndex: 10, fontSize: '16px', fontWeight: 'bold' }}>
              ✕
            </button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe 
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`} 
                title="YouTube recipe video" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {isManualModalOpen && (
        <div className="diet-modal-bg" onClick={handleCloseManualModal}>
          <div onClick={(e) => e.stopPropagation()} className="diet-modal-box">
            <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '20px', fontWeight: '800' }}>식단 직접 입력</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>식사 타입</label>
              <select name="mealType" value={recordForm.mealType} onChange={handleFormChange}>
                <option value="아침">아침</option>
                <option value="점심">점심</option>
                <option value="저녁">저녁</option>
                <option value="간식">간식</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>음식 이름</label>
              <input type="text" name="foodName" value={recordForm.foodName} onChange={handleFormChange} placeholder="예: 닭가슴살 샐러드" />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>칼로리(kcal)</label>
                <input type="number" name="calories" value={recordForm.calories} onChange={handleFormChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>탄수화물(g)</label>
                <input type="number" name="carbs" value={recordForm.carbs} onChange={handleFormChange} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>단백질(g)</label>
                <input type="number" name="protein" value={recordForm.protein} onChange={handleFormChange} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>지방(g)</label>
                <input type="number" name="fat" value={recordForm.fat} onChange={handleFormChange} />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleCloseManualModal} className="diet-btn diet-btn--secondary" style={{ flex: 1 }}>취소</button>
              <button onClick={handleManualSubmit} className="diet-btn diet-btn--primary" style={{ flex: 1 }}>기록 확인</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DietManagement;