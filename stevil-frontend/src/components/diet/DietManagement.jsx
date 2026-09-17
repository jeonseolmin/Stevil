import { useEffect, useMemo, useState } from 'react';
import SavedPlanPanel from '../planner/SavedPlanPanel';
import axiosInstance from '../../api/axiosInstance';
import './DietManagement.css';
import AiDietCoach from './AiDietCoach';
import { IconSearch } from '../icons/Icons.jsx';

const EMPTY_RECORD_FORM = {
  mealType: '점심',
  foodName: '',
  calories: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
};

const DietManagement = () => {
  // =========================================================
  // 1. 모든 훅(Hook)은 컴포넌트 최상단에 고정
  // =========================================================
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [viewMode, setViewMode] = useState('DAILY');

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);
  const [activeVideoId, setActiveVideoId] = useState(null);
  
  const [showToast, setShowToast] = useState(false);

  const dietRecipes = [
    {
      id: 1,
      title: '단백질 중심 닭가슴살 볶음밥',
      channel: '헬스요리사',
      videoId: 'dQw4w9WgXcQ',
    },
    {
      id: 2,
      title: '아보카도 연어 샐러드',
      channel: '슬림키친',
      videoId: '3JZ_D3ELwOQ',
    },
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
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (dashboardData) {
      const proteinTarget = Number(dashboardData.targetProtein) || Number(dashboardData.proteinDetail?.targetAmount) || 0;
      const todayProtein = Number(dashboardData.todayProtein) || 0;
      const deficit = Math.max(Math.round((proteinTarget - todayProtein) * 10) / 10, 0);

      // 남은 단백질이 0보다 클 때만 띄움
      if (deficit > 0) {
        setShowToast(true);

        // 7초 뒤 자동으로 알림 닫기
        const timer = setTimeout(() => {
          setShowToast(false);
        }, 7000);

        return () => clearTimeout(timer);
      }
    }
  }, [dashboardData]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/diet/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('식단 대시보드 조회 실패', error);
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFoodSearchAPI = async (searchWord) => {
    setIsSearching(true);
    try {
      const response = await axiosInstance.get(
        `/diet/food/search?keyword=${encodeURIComponent(searchWord)}`
      );
      let data = response.data;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          // JSON 파싱 실패 무시
        }
      }

      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data?.content && Array.isArray(data.content)) {
        // Spring Page 객체로 넘어올 경우 대응
        items = data.content;
      } else if (data?.body?.items) {
        items = Array.isArray(data.body.items)
          ? data.body.items
          : data.body.items.item || [];
      } else if (data?.items && Array.isArray(data.items)) {
        items = data.items;
      }

      setSearchResults(items);
    } catch (error) {
      console.error('음식 검색 실패', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const parseFoodData = (item) => {
    const parseNum = (value) => {
      const number = Number(value);
      return Number.isNaN(number) ? 0 : Math.round(number * 10) / 10;
    };

    return {
      name:
        item.DESC_KOR ||
        item.desc_kor ||
        item.FOOD_NM_KR ||
        item.food_nm_kr ||
        item.foodName ||
        item.name ||
        '이름 없음',
      kcal: parseNum(
        item.NUTR_CONT1 || item.nutr_cont1 || item.AMT_NUM1 || item.calories || item.kcal
      ),
      carbs: parseNum(
        item.NUTR_CONT2 || item.nutr_cont2 || item.AMT_NUM7 || item.carbs
      ),
      protein: parseNum(
        item.NUTR_CONT3 || item.nutr_cont3 || item.AMT_NUM3 || item.protein
      ),
      fat: parseNum(
        item.NUTR_CONT4 || item.nutr_cont4 || item.AMT_NUM4 || item.fat
      ),
      servingSize:
        item.SERVING_WT ||
        item.serving_wt ||
        item.SERVING_SIZE ||
        item.serving_size ||
        '100g',
    };
  };

  const handleSelectSearchedFood = (foodData) => {
    const parsed = parseFoodData(foodData);
    setRecordForm({
      mealType: '점심',
      foodName: parsed.name,
      calories: Number(parsed.kcal) || 0,
      carbs: Number(parsed.carbs) || 0,
      protein: Number(parsed.protein) || 0,
      fat: Number(parsed.fat) || 0,
    });
    setKeyword('');
    setSearchResults([]);
    setIsManualModalOpen(true);
  };

  const handleCloseManualModal = () => {
    setIsManualModalOpen(false);
    setRecordForm({ ...EMPTY_RECORD_FORM });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setRecordForm((previous) => ({
      ...previous,
      [name]:
        name === 'foodName' || name === 'mealType' ? value : Number(value),
    }));
  };

  const handleManualSubmit = async () => {
    if (!recordForm.foodName.trim()) {
      alert('음식명을 입력해주세요.');
      return;
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      handleCloseManualModal();
      await fetchDashboardData();
    } catch (error) {
      console.error('식단 기록 실패', error);
      alert('식단 기록 중 오류가 발생했습니다.');
    }
  };

  const calcPercent = (current, target) => {
    if (!target || target <= 0) return 0;
    return Math.min(
      Math.round((Number(current || 0) / Number(target)) * 100),
      100
    );
  };

  const getStatusColor = (status) => {
    if (status === '부족') return 'orange';
    if (status === '과다') return 'red';
    return 'green';
  };

  const getProteinFunMessage = (deficit) => {
    if (deficit <= 0) return '오늘의 단백질 목표를 완벽하게 달성하셨습니다!';
    const eggCount = Math.ceil(deficit / 6);
    const chickenCount = (deficit / 23).toFixed(1);
    return `오늘 목표까지 ${deficit}g 남았어요! 계란 약 ${eggCount}개 (또는 닭가슴살 약 ${chickenCount}조각) 분량의 단백질이 더 필요해요!`;
  };

  // =========================================================
  // 2. 렌더링 분기 (모든 훅 선언 이후에 위치)
  // =========================================================

  if (isLoading) {
    return (
      <div className="diet-page">
        <div className="diet-container">
          <div className="diet-loading">식단 데이터를 불러오는 중입니다.</div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="diet-page">
        <div className="diet-container">
          <div className="diet-loading">
            <p>식단 목표 정보를 불러오지 못했습니다.</p>
            <button type="button" className="diet-loading-retry" onClick={fetchDashboardData}>
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    todayTotalCalories = 0,
    targetCalories = 0,
    todayCarbs = 0,
    todayProtein = 0,
    todayFat = 0,
    targetProtein = 0,
    proteinAchievementRate = 0,
    proteinDeficit = 0,
    hasAllergyWarning = false,
    registeredAllergies = [],
    warningFoodName = '',
    detectedAllergens = [],
    carbsDetail = {},
    proteinDetail = {},
    fatDetail = {},
    fiberDetail = {},
    sodiumDetail = {},
    targetWeight = 0,
    todayRecords = [],
  } = dashboardData;

  const effectiveProteinTarget =
    Number(targetProtein) || Number(proteinDetail?.targetAmount) || 0;

  const effectiveProteinRate =
    Number(proteinAchievementRate) ||
    (effectiveProteinTarget > 0
      ? Math.round(
          (Number(todayProtein) / effectiveProteinTarget) * 1000
        ) / 10
      : 0);

  const effectiveProteinDeficit =
    Number(proteinDeficit) ||
    Math.max(
      Math.round((effectiveProteinTarget - Number(todayProtein)) * 10) / 10,
      0
    );

  const proteinBarPercent = Math.min(effectiveProteinRate, 100);
  const caloriePercent = calcPercent(todayTotalCalories, targetCalories);
  const carbsPercent = calcPercent(todayCarbs, carbsDetail?.targetAmount);
  const fatPercent = calcPercent(todayFat, fatDetail?.targetAmount);
  const fiberPercent = calcPercent(
    fiberDetail?.currentAmount,
    fiberDetail?.targetAmount
  );

  const proteinFunMessage = getProteinFunMessage(effectiveProteinDeficit);

  return (
    <div className="diet-page">
      <div className="diet-container">
        {/* Header */}
        <header className="diet-header">
          <div>
            <span className="diet-header-eyebrow">Nutrition</span>
            <h1>식단 관리</h1>
            <p>체중 감량 중 필요한 영양을 균형 있게 기록하고 관리하세요.</p>
          </div>

          <div className="diet-action-bar">
            {/* 음식 검색창 */}
            <div className="diet-search-wrapper">
              <span className="diet-search-icon"><IconSearch /></span>
              <input
                type="text"
                placeholder="음식 검색"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />

              {isSearching && (
                <span className="diet-search-loading">검색중</span>
              )}

              {searchResults.length > 0 && (
                <div className="diet-search-results">
                  {searchResults.map((item, index) => {
                    const parsed = parseFoodData(item);
                    return (
                      <button
                        type="button"
                        className="diet-search-result"
                        key={`${parsed.name}-${index}`}
                        onClick={() => handleSelectSearchedFood(item)}
                      >
                        <strong>{parsed.name}</strong>
                        <span>{parsed.servingSize} 기준</span>
                        <small>
                          단백질 {parsed.protein}g {' · '} {parsed.kcal} kcal{' '}
                          {' · '} 탄 {parsed.carbs}g {' · '} 지 {parsed.fat}g
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              className="diet-btn diet-btn--primary"
              onClick={() => setIsManualModalOpen(true)}
            >
              + 식단 기록
            </button>
          </div>
        </header>

        {/* Planner */}
        <SavedPlanPanel kind="food" />

        {/* Protein Hero */}
        <section className="diet-protein-hero">
          <div className="diet-protein-main">
            <div className="diet-protein-heading">
              <div>
                <span className="diet-section-eyebrow">오늘의 핵심 영양</span>
                <h2>단백질</h2>
              </div>

              <span
                className={`diet-protein-status ${
                  effectiveProteinRate >= 100
                    ? 'complete'
                    : effectiveProteinRate >= 80
                    ? 'good'
                    : 'low'
                }`}
              >
                {Math.round(effectiveProteinRate)}%
              </span>
            </div>

            <div className="diet-protein-value">
              <strong>{Number(todayProtein).toFixed(1)}</strong>
              <span>/ {effectiveProteinTarget}g</span>
            </div>

            <div className="diet-protein-track">
              <span
                className="diet-protein-fill"
                style={{ width: `${proteinBarPercent}%` }}
              />
            </div>

            {/* 계란 / 닭가슴살 비유 알림 */}
            <p className="diet-protein-message">
             {proteinFunMessage}
            </p>

            <p className="diet-protein-help">
              단백질은 체중 감량 중 근육 보존에 중요한 영양소입니다. 총 섭취량과
              다른 영양소도 함께 관리하는 것이 중요합니다.
            </p>
          </div>

          <div className="diet-protein-side">
            <span className="diet-mini-label">목표까지 남은 양</span>
            <strong>
              {effectiveProteinDeficit}
              <small>g</small>
            </strong>
            <span className="diet-mini-caption">오늘 기준</span>
          </div>
        </section>

        {/* Main Grid */}
        <div className="diet-grid">
          {/* Left Panel */}
          <div className="diet-left-panel">
            {/* 전체 섭취 */}
            <section className="diet-card">
              <div className="diet-card-header">
                <div>
                  <span className="diet-card-eyebrow">ENERGY & MACROS</span>
                  <h3>오늘의 전체 섭취</h3>
                </div>
                <button
                  type="button"
                  className="diet-text-btn"
                  onClick={() => setIsDetailModalOpen(true)}
                >
                  상세 보기
                </button>
              </div>

              <div className="diet-calorie-row">
                <div>
                  <strong className="diet-current-kcal">
                    {Number(todayTotalCalories).toLocaleString()}
                    <span> kcal</span>
                  </strong>
                  <span className="diet-target-kcal">
                    목표 {Number(targetCalories).toLocaleString()} kcal
                  </span>
                </div>
                <span className="diet-calorie-percent">{caloriePercent}%</span>
              </div>

              <div className="diet-progress-track">
                <span
                  className="diet-progress-bar"
                  style={{ width: `${caloriePercent}%` }}
                />
              </div>

              <div className="diet-macro-summary">
                <div className="diet-macro-item">
                  <span>탄수화물</span>
                  <strong>{todayCarbs}g</strong>
                  <small>{carbsPercent}%</small>
                </div>
                <div className="diet-macro-item protein">
                  <span>단백질</span>
                  <strong>{todayProtein}g</strong>
                  <small>{Math.round(effectiveProteinRate)}%</small>
                </div>
                <div className="diet-macro-item">
                  <span>지방</span>
                  <strong>{todayFat}g</strong>
                  <small>{fatPercent}%</small>
                </div>
                <div className="diet-macro-item">
                  <span>식이섬유</span>
                  <strong>{fiberDetail?.currentAmount || 0}g</strong>
                  <small>{fiberPercent}%</small>
                </div>
              </div>
            </section>

            {/* 알레르기 */}
            {hasAllergyWarning && (
              <section className="diet-allergy-card">
                <div className="diet-allergy-icon">!</div>
                <div>
                  <strong>알레르기 주의</strong>
                  <p>{warningFoodName}</p>
                  <span>감지 성분: {detectedAllergens.join(', ')}</span>
                </div>
              </section>
            )}

            {/* 오늘 식단 기록 */}
            <section className="diet-card">
              <div className="diet-card-header">
                <div>
                  <span className="diet-card-eyebrow">TODAY</span>
                  <h3>오늘의 식단 기록</h3>
                </div>

                <div className="diet-view-mode-btns">
                  <button
                    type="button"
                    className={viewMode === 'DAILY' ? 'active' : ''}
                    onClick={() => setViewMode('DAILY')}
                  >
                    일간
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'WEEKLY' ? 'active' : ''}
                    onClick={() => setViewMode('WEEKLY')}
                  >
                    주간
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'MONTHLY' ? 'active' : ''}
                    onClick={() => setViewMode('MONTHLY')}
                  >
                    월간
                  </button>
                </div>
              </div>

              {viewMode !== 'DAILY' && (
                <div className="diet-period-notice">
                  주간/월간 분석은 다음 단계에서 최근 기록 기반 분석과 연결할
                  예정입니다.
                </div>
              )}

              <div className="diet-meal-grid">
                {todayRecords.length > 0 ? (
                  todayRecords.map((record) => {
                    const recordProtein = Number(
                      record.protein ??
                        record.proteinAmount ??
                        record.protein_amount ??
                        record.nutrientProtein ??
                        0
                    );

                    return (
                      <article key={record.recordId} className="diet-meal-box">
                        <div className="diet-meal-title">
                          <span className="diet-meal-badge">
                            {record.mealType}
                          </span>
                          <span className="diet-meal-time">
                            {record.time ? record.time.substring(0, 5) : ''}
                          </span>
                        </div>
                        <p className="diet-meal-desc">{record.foodName}</p>
                        <div className="diet-meal-bottom">
                          <div className="diet-meal-protein">
                            <span>단백질</span>
                            <strong>{recordProtein.toFixed(1)}g</strong>
                          </div>
                          <div className="diet-meal-kcal">
                            {record.calories} <span>kcal</span>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="diet-empty-state">
                    <strong>아직 오늘의 식단 기록이 없습니다.</strong>
                    <span>
                      식사를 기록하면 단백질과 영양 섭취량을 바로 확인할 수
                      있어요.
                    </span>
                    <button
                      type="button"
                      className="diet-btn diet-btn--primary"
                      onClick={() => setIsManualModalOpen(true)}
                    >
                      첫 식단 기록하기
                    </button>
                  </div>
                )}
              </div>

              {/* 진짜 막대형(Bar Chart) 분석 그래프 */}
              <div style={{ marginTop: '35px', padding: '24px', background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    단백질 섭취량 달성도 분석 그래프
                  </h4>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-primary-dark)', background: 'var(--color-primary-soft)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--color-primary-light)' }}>
                    달성률 {Math.round(effectiveProteinRate)}%
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                  기록된 단백질 총 <strong style={{ color: 'var(--color-text-primary)' }}>{todayProtein.toFixed(1)}g</strong> / 일일 권장 목표 <strong style={{ color: 'var(--color-text-primary)' }}>{effectiveProteinTarget}g</strong>
                </p>

                {/* Vertical Bar Chart 구조 */}
                <div style={{ display: 'flex', height: '160px', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: '20px', paddingBottom: '10px', borderBottom: '2px solid var(--color-border-light)' }}>
                  
                  {/* 현재 섭취량 막대 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '40%' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-dark)', marginBottom: '8px' }}>{todayProtein.toFixed(1)}g</span>
                    <div style={{ 
                      width: '60px', 
                      height: `${Math.max(proteinBarPercent, 5)}%`, 
                      background: 'linear-gradient(180deg, var(--color-primary-light), var(--color-primary-dark))', 
                      borderRadius: '8px 8px 0 0',
                      transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 6px -1px rgba(35, 95, 75, 0.3)'
                    }}></div>
                    <span style={{ marginTop: '12px', fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>오늘 섭취량</span>
                  </div>

                  {/* 목표량 막대 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', width: '40%' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>{effectiveProteinTarget}g</span>
                    <div style={{ 
                      width: '60px', 
                      height: '100%', 
                      background: 'var(--color-border-light)', 
                      borderRadius: '8px 8px 0 0' 
                    }}></div>
                    <span style={{ marginTop: '12px', fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>일일 권장량</span>
                  </div>

                </div>
              </div>
            </section>

            {/* 레시피 */}
            <section className="diet-card">
              <div className="diet-card-header">
                <div>
                  <span className="diet-card-eyebrow">MEAL IDEAS</span>
                  <h3>식단 아이디어</h3>
                </div>
              </div>

              <div className="diet-recipe-grid">
                {dietRecipes.map((recipe) => (
                  <button
                    type="button"
                    className="diet-recipe-card"
                    key={recipe.id}
                    onClick={() => setActiveVideoId(recipe.videoId)}
                  >
                    <div className="diet-recipe-image">
                      <img
                        src={`https://img.youtube.com/vi/${recipe.videoId}/hqdefault.jpg`}
                        alt={recipe.title}
                      />
                      <span className="diet-recipe-play">▶</span>
                    </div>
                    <div className="diet-recipe-content">
                      <strong>{recipe.title}</strong>
                      <span>{recipe.channel}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right Panel */}
          <aside className="diet-right-panel">
            {/* 영양 상태 */}
            <section className="diet-card">
              <span className="diet-card-eyebrow">NUTRITION STATUS</span>
              <h3 className="diet-side-title">영양 섭취 상태</h3>

              <div className="diet-nutrient-details">
                <NutrientRow
                  label="단백질"
                  current={todayProtein}
                  target={effectiveProteinTarget}
                  status={proteinDetail?.status}
                  color={getStatusColor(proteinDetail?.status)}
                  highlight
                />
                <NutrientRow
                  label="탄수화물"
                  current={todayCarbs}
                  target={carbsDetail?.targetAmount}
                  status={carbsDetail?.status}
                  color={getStatusColor(carbsDetail?.status)}
                />
                <NutrientRow
                  label="지방"
                  current={todayFat}
                  target={fatDetail?.targetAmount}
                  status={fatDetail?.status}
                  color={getStatusColor(fatDetail?.status)}
                />
                <NutrientRow
                  label="식이섬유"
                  current={fiberDetail?.currentAmount || 0}
                  target={fiberDetail?.targetAmount || 0}
                  status={fiberDetail?.status}
                  color={getStatusColor(fiberDetail?.status)}
                />
                <NutrientRow
                  label="나트륨"
                  current={sodiumDetail?.currentAmount || 0}
                  target={sodiumDetail?.targetAmount || 0}
                  status={sodiumDetail?.status}
                  color={getStatusColor(sodiumDetail?.status)}
                  unit="mg"
                />
              </div>
            </section>

            {/* 추천 목표 */}
            <section className="diet-card">
              <div className="diet-card-header">
                <div>
                  <span className="diet-card-eyebrow">DAILY GOAL</span>
                  <h3>현재 영양 목표</h3>
                </div>
              </div>

              <div className="diet-goals-grid">
                <div className="diet-goal-card diet-goal-card--primary">
                  <span>단백질 목표</span>
                  <strong>
                    {effectiveProteinTarget}
                    <small>g</small>
                  </strong>
                </div>
                <div className="diet-goal-card">
                  <span>권장 칼로리</span>
                  <strong>
                    {Number(targetCalories).toLocaleString()}
                    <small>kcal</small>
                  </strong>
                </div>
                <div className="diet-goal-card">
                  <span>탄수화물</span>
                  <strong>
                    {carbsDetail?.targetAmount || 0}
                    <small>g</small>
                  </strong>
                </div>
                <div className="diet-goal-card">
                  <span>지방</span>
                  <strong>
                    {fatDetail?.targetAmount || 0}
                    <small>g</small>
                  </strong>
                </div>
              </div>

              <div className="diet-target-weight">
                <span>체중 목표</span>
                <strong>{targetWeight} kg</strong>
              </div>
            </section>

            {/* 오늘 단백질 기록 요약 */}
            <section className="diet-card diet-protein-record-card">
              <span className="diet-card-eyebrow">PROTEIN LOG</span>
              <h3 className="diet-side-title">오늘 단백질 기록</h3>

              <div className="diet-protein-record-value">
                <strong>{todayProtein.toFixed(1)}g</strong>
                <span>{todayRecords.length}개 식사 기록</span>
              </div>
              <p>
                기록되지 않은 식사는 0g으로 판단하지 않습니다. 기록된 식단을
                기준으로만 섭취량을 계산합니다.
              </p>
            </section>

            {/* 알레르기 등록 정보 */}
            {registeredAllergies.length > 0 && (
              <section className="diet-card">
                <span className="diet-card-eyebrow">ALLERGY</span>
                <h3 className="diet-side-title">등록된 알레르기</h3>
                <div className="diet-allergy-tags">
                  {registeredAllergies.map((allergy) => (
                    <span key={allergy}>{allergy}</span>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* Nutrition Detail Modal */}
      {isDetailModalOpen && (
        <div className="diet-modal-bg" onClick={() => setIsDetailModalOpen(false)}>
          <div
            className="diet-modal-box"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="diet-modal-header">
              <div>
                <span className="diet-card-eyebrow">TODAY</span>
                <h3>오늘의 영양 요약</h3>
              </div>
              <button type="button" onClick={() => setIsDetailModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="diet-detail-summary">
              <div>
                <span>단백질</span>
                <strong>
                  {todayProtein} / {effectiveProteinTarget}g
                </strong>
                <small>{Math.round(effectiveProteinRate)}%</small>
              </div>
              <div>
                <span>총 섭취</span>
                <strong>
                  {Number(todayTotalCalories).toLocaleString()} /{' '}
                  {Number(targetCalories).toLocaleString()} kcal
                </strong>
                <small>{caloriePercent}%</small>
              </div>
              <div>
                <span>탄수화물</span>
                <strong>
                  {todayCarbs} / {carbsDetail?.targetAmount || 0}g
                </strong>
              </div>
              <div>
                <span>지방</span>
                <strong>
                  {todayFat} / {fatDetail?.targetAmount || 0}g
                </strong>
              </div>
            </div>

            <div className="diet-modal-note">
              단백질은 감량 중 중요한 지표지만 단백질 섭취량 하나만으로 식사의 질을
              판단하지 않습니다. 총 에너지와 다른 영양소도 함께 확인하세요.
            </div>

            <button
              type="button"
              className="diet-btn diet-btn--primary diet-modal-confirm"
              onClick={() => setIsDetailModalOpen(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Manual Input Modal */}
      {isManualModalOpen && (
        <div className="diet-modal-bg" onClick={handleCloseManualModal}>
          <div
            className="diet-modal-box diet-record-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="diet-modal-header">
              <div>
                <span className="diet-card-eyebrow">NEW MEAL</span>
                <h3>식단 기록</h3>
              </div>
              <button type="button" onClick={handleCloseManualModal}>
                ×
              </button>
            </div>

            <div className="diet-form-group">
              <label>식사 구분</label>
              <select
                name="mealType"
                value={recordForm.mealType}
                onChange={handleFormChange}
              >
                <option value="아침">아침</option>
                <option value="점심">점심</option>
                <option value="저녁">저녁</option>
                <option value="간식">간식</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div className="diet-form-group">
              <label>음식명</label>
              <input
                type="text"
                name="foodName"
                placeholder="예: 닭가슴살 볶음밥"
                value={recordForm.foodName}
                onChange={handleFormChange}
              />
            </div>

            <div className="diet-form-highlight">
              <label>
                단백질 <span>핵심 기록</span>
              </label>
              <div className="diet-input-with-unit">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  name="protein"
                  value={recordForm.protein}
                  onChange={handleFormChange}
                />
                <span>g</span>
              </div>
            </div>

            <div className="diet-form-grid">
              <div className="diet-form-group">
                <label>칼로리</label>
                <div className="diet-input-with-unit">
                  <input
                    type="number"
                    min="0"
                    name="calories"
                    value={recordForm.calories}
                    onChange={handleFormChange}
                  />
                  <span>kcal</span>
                </div>
              </div>

              <div className="diet-form-group">
                <label>탄수화물</label>
                <div className="diet-input-with-unit">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    name="carbs"
                    value={recordForm.carbs}
                    onChange={handleFormChange}
                  />
                  <span>g</span>
                </div>
              </div>

              <div className="diet-form-group">
                <label>지방</label>
                <div className="diet-input-with-unit">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    name="fat"
                    value={recordForm.fat}
                    onChange={handleFormChange}
                  />
                  <span>g</span>
                </div>
              </div>
            </div>

            <div className="diet-modal-actions">
              <button
                type="button"
                className="diet-btn diet-btn--secondary"
                onClick={handleCloseManualModal}
              >
                취소
              </button>
              <button
                type="button"
                className="diet-btn diet-btn--primary"
                onClick={handleManualSubmit}
              >
                기록 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {activeVideoId && (
        <div className="diet-modal-bg" onClick={() => setActiveVideoId(null)}>
          <div
            className="diet-video-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="diet-video-close"
              onClick={() => setActiveVideoId(null)}
            >
              ×
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
              title="식단 레시피"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {showToast && (
        <div className="diet-toast-notification">
          <div className="diet-toast-icon"></div>
          <div className="diet-toast-content">
            <strong>오늘의 단백질 리마인더</strong>
            <p>{proteinFunMessage}</p>
          </div>
          <button
            type="button"
            className="diet-toast-close"
            onClick={() => setShowToast(false)}
          >
            ×
          </button>
        </div>
      )}

      <AiDietCoach />
    </div>
  );
};

const NutrientRow = ({
  label,
  current = 0,
  target = 0,
  status = '적정',
  color = 'green',
  unit = 'g',
  highlight = false,
}) => {
  const percent =
    Number(target) > 0
      ? Math.min(
          Math.round((Number(current) / Number(target)) * 100),
          100
        )
      : 0;

  return (
    <div
      className={`diet-nutrient-item ${
        highlight ? 'diet-nutrient-item--highlight' : ''
      }`}
    >
      <div className="diet-nutrient-head">
        <div>
          <span className={`diet-dot ${color}`} />
          <strong>{label}</strong>
        </div>
        <span className={`diet-status ${color}`}>{status}</span>
      </div>

      <div className="diet-nutrient-amount">
        <strong>{current}</strong>
        <span>
          / {target} {unit}
        </span>
      </div>

      <div className="diet-n-bar-bg">
        <span
          className="diet-n-bar-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default DietManagement;