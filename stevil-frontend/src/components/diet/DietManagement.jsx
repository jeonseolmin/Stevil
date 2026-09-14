import { useEffect, useMemo, useState } from 'react';
import SavedPlanPanel from '../planner/SavedPlanPanel';
import axiosInstance from '../../api/axiosInstance';
import './DietManagement.css';

const EMPTY_RECORD_FORM = {
  mealType: '점심',
  foodName: '',
  calories: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
};

const DietManagement = () => {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [viewMode, setViewMode] = useState('DAILY');

  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [recordForm, setRecordForm] = useState(
      EMPTY_RECORD_FORM
  );

  const [activeVideoId, setActiveVideoId] = useState(null);

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

  // =========================================================
  // 최초 데이터 조회
  // =========================================================

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // =========================================================
  // 음식 검색 debounce
  // =========================================================

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

  // =========================================================
  // API
  // =========================================================

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      const response = await axiosInstance.get(
          '/diet/dashboard'
      );

      setDashboardData(response.data);
    } catch (error) {
      console.error(
          '식단 대시보드 조회 실패',
          error
      );

      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFoodSearchAPI = async (searchWord) => {
    setIsSearching(true);

    try {
      const response = await axiosInstance.get(
          `/diet/food/search?keyword=${encodeURIComponent(
              searchWord
          )}`
      );

      let data = response.data;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          // 문자열이지만 JSON이 아닐 경우 그대로 둠
        }
      }

      let items = [];

      if (data?.body?.items) {
        items = Array.isArray(data.body.items)
            ? data.body.items
            : data.body.items.item || [];
      } else if (Array.isArray(data)) {
        items = data;
      }

      setSearchResults(items);
    } catch (error) {
      console.error(
          '음식 검색 실패',
          error
      );

      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // =========================================================
  // 음식 데이터 파싱
  // =========================================================

  const parseFoodData = (item) => {
    const parseNum = (value) => {
      const number = Number(value);

      return Number.isNaN(number)
          ? 0
          : Math.round(number * 10) / 10;
    };

    return {
      name:
          item.DESC_KOR ||
          item.desc_kor ||
          item.FOOD_NM_KR ||
          item.food_nm_kr ||
          item.foodName ||
          '이름 없음',

      kcal: parseNum(
          item.NUTR_CONT1 ||
          item.nutr_cont1 ||
          item.AMT_NUM1 ||
          item.calories
      ),

      carbs: parseNum(
          item.NUTR_CONT2 ||
          item.nutr_cont2 ||
          item.AMT_NUM7 ||
          item.carbs
      ),

      protein: parseNum(
          item.NUTR_CONT3 ||
          item.nutr_cont3 ||
          item.AMT_NUM3 ||
          item.protein
      ),

      fat: parseNum(
          item.NUTR_CONT4 ||
          item.nutr_cont4 ||
          item.AMT_NUM4 ||
          item.fat
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

  // =========================================================
  // 직접 입력
  // =========================================================

  const handleCloseManualModal = () => {
    setIsManualModalOpen(false);

    setRecordForm({
      ...EMPTY_RECORD_FORM,
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setRecordForm((previous) => ({
      ...previous,

      [name]:
          name === 'foodName' || name === 'mealType'
              ? value
              : Number(value),
    }));
  };

  const handleManualSubmit = async () => {
    if (!recordForm.foodName.trim()) {
      alert('음식명을 입력해주세요.');
      return;
    }

    try {
      const formData = new FormData();

      formData.append(
          'mealType',
          recordForm.mealType
      );

      formData.append(
          'foodName',
          recordForm.foodName
      );

      formData.append(
          'calories',
          recordForm.calories
      );

      formData.append(
          'carbs',
          recordForm.carbs
      );

      formData.append(
          'protein',
          recordForm.protein
      );

      formData.append(
          'fat',
          recordForm.fat
      );

      await axiosInstance.post(
          '/diet/record',
          formData,
          {
            headers: {
              'Content-Type':
                  'multipart/form-data',
            },
          }
      );

      handleCloseManualModal();

      await fetchDashboardData();
    } catch (error) {
      console.error(
          '식단 기록 실패',
          error
      );

      alert('식단 기록 중 오류가 발생했습니다.');
    }
  };

  // =========================================================
  // 화면 계산
  // =========================================================

  const calcPercent = (current, target) => {
    if (!target || target <= 0) {
      return 0;
    }

    return Math.min(
        Math.round(
            (Number(current || 0) /
                Number(target)) *
            100
        ),
        100
    );
  };

  const getStatusColor = (status) => {
    if (status === '부족') {
      return 'orange';
    }

    if (status === '과다') {
      return 'red';
    }

    return 'green';
  };

  const getProteinMessage = (
      achievementRate,
      deficit
  ) => {
    if (achievementRate >= 100) {
      return '오늘의 단백질 목표를 달성했어요.';
    }

    if (achievementRate >= 80) {
      return `목표까지 약 ${deficit}g 남았어요.`;
    }

    if (achievementRate > 0) {
      return `오늘 ${deficit}g 정도의 단백질이 더 필요해요.`;
    }

    return '식사를 기록하면 단백질 섭취량을 확인할 수 있어요.';
  };

  // =========================================================
  // Loading
  // =========================================================

  if (isLoading) {
    return (
        <div className="diet-page">
          <div className="diet-container">
            <div className="diet-loading">
              식단 데이터를 불러오는 중입니다.
            </div>
          </div>
        </div>
    );
  }

  if (!dashboardData) {
    return (
        <div className="diet-page">
          <div className="diet-container">
            <div className="diet-loading">
              식단 목표 정보를 불러오지 못했습니다.
            </div>
          </div>
        </div>
    );
  }

  // =========================================================
  // Dashboard Data
  // =========================================================

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

  /*
   * 기존 API 응답과의 호환성을 위해
   * targetProtein 값이 없다면 proteinDetail을 사용.
   */
  const effectiveProteinTarget =
      Number(targetProtein) ||
      Number(proteinDetail?.targetAmount) ||
      0;

  /*
   * 신규 API 필드가 없을 때도
   * 프론트가 깨지지 않도록 fallback.
   */
  const effectiveProteinRate =
      Number(proteinAchievementRate) ||
      (
          effectiveProteinTarget > 0
              ? Math.round(
              (Number(todayProtein) /
                  effectiveProteinTarget) *
              1000
          ) / 10
              : 0
      );

  const effectiveProteinDeficit =
      Number(proteinDeficit) ||
      Math.max(
          Math.round(
              (
                  effectiveProteinTarget -
                  Number(todayProtein)
              ) *
              10
          ) / 10,
          0
      );

  const proteinBarPercent = Math.min(
      effectiveProteinRate,
      100
  );

  const caloriePercent = calcPercent(
      todayTotalCalories,
      targetCalories
  );

  const carbsPercent = calcPercent(
      todayCarbs,
      carbsDetail?.targetAmount
  );

  const fatPercent = calcPercent(
      todayFat,
      fatDetail?.targetAmount
  );

  const fiberPercent = calcPercent(
      fiberDetail?.currentAmount,
      fiberDetail?.targetAmount
  );

  const proteinMessage = getProteinMessage(
      effectiveProteinRate,
      effectiveProteinDeficit
  );

  const recordedProteinTotal = useMemo(
      () =>
          todayRecords.reduce(
              (sum, record) =>
                  sum + Number(record.protein || 0),
              0
          ),
      [todayRecords]
  );

  return (
      <div className="diet-page">
        <div className="diet-container">

          {/* ================================================= */}
          {/* Header */}
          {/* ================================================= */}

          <header className="diet-header">
            <div>
            <span className="diet-header-eyebrow">
              Nutrition
            </span>

              <h1>식단 관리</h1>

              <p>
                체중 감량 중 필요한 영양을
                균형 있게 기록하고 관리하세요.
              </p>
            </div>

            <div className="diet-action-bar">

              {/* 음식 검색 */}

              <div className="diet-search-wrapper">
              <span className="diet-search-icon">
                🔍
              </span>

                <input
                    type="text"
                    placeholder="음식 검색"
                    value={keyword}
                    onChange={(event) =>
                        setKeyword(event.target.value)
                    }
                />

                {isSearching && (
                    <span className="diet-search-loading">
                  검색중
                </span>
                )}

                {searchResults.length > 0 && (
                    <div className="diet-search-results">
                      {searchResults.map(
                          (item, index) => {
                            const parsed =
                                parseFoodData(item);

                            return (
                                <button
                                    type="button"
                                    className="diet-search-result"
                                    key={`${parsed.name}-${index}`}
                                    onClick={() =>
                                        handleSelectSearchedFood(
                                            item
                                        )
                                    }
                                >
                                  <strong>
                                    {parsed.name}
                                  </strong>

                                  <span>
                            {parsed.servingSize} 기준
                          </span>

                                  <small>
                                    단백질{' '}
                                    {parsed.protein}g
                                    {' · '}
                                    {parsed.kcal} kcal
                                    {' · '}
                                    탄 {parsed.carbs}g
                                    {' · '}
                                    지 {parsed.fat}g
                                  </small>
                                </button>
                            );
                          }
                      )}
                    </div>
                )}
              </div>

              <button
                  type="button"
                  className="diet-btn diet-btn--primary"
                  onClick={() =>
                      setIsManualModalOpen(true)
                  }
              >
                + 식단 기록
              </button>
            </div>
          </header>

          {/* ================================================= */}
          {/* Planner */}
          {/* ================================================= */}

          <SavedPlanPanel kind="food" />

          {/* ================================================= */}
          {/* Protein Hero */}
          {/* ================================================= */}

          <section className="diet-protein-hero">
            <div className="diet-protein-main">

              <div className="diet-protein-heading">
                <div>
                <span className="diet-section-eyebrow">
                  오늘의 핵심 영양
                </span>

                  <h2>
                    단백질
                  </h2>
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
                {Math.round(
                    effectiveProteinRate
                )}
                  %
              </span>
              </div>

              <div className="diet-protein-value">
                <strong>
                  {Number(
                      todayProtein
                  ).toFixed(1)}
                </strong>

                <span>
                / {effectiveProteinTarget}g
              </span>
              </div>

              <div className="diet-protein-track">
              <span
                  className="diet-protein-fill"
                  style={{
                    width: `${proteinBarPercent}%`,
                  }}
              />
              </div>

              <p className="diet-protein-message">
                {proteinMessage}
              </p>

              <p className="diet-protein-help">
                단백질은 체중 감량 중 근육 보존에
                중요한 영양소입니다. 총 섭취량과
                다른 영양소도 함께 관리하는 것이
                중요합니다.
              </p>
            </div>

            <div className="diet-protein-side">
            <span className="diet-mini-label">
              목표까지 남은 양
            </span>

              <strong>
                {effectiveProteinDeficit}
                <small>g</small>
              </strong>

              <span className="diet-mini-caption">
              오늘 기준
            </span>
            </div>
          </section>

          {/* ================================================= */}
          {/* Main Grid */}
          {/* ================================================= */}

          <div className="diet-grid">

            {/* =============================================== */}
            {/* Left */}
            {/* =============================================== */}

            <div className="diet-left-panel">

              {/* 전체 섭취 */}

              <section className="diet-card">

                <div className="diet-card-header">
                  <div>
                  <span className="diet-card-eyebrow">
                    ENERGY & MACROS
                  </span>

                    <h3>
                      오늘의 전체 섭취
                    </h3>
                  </div>

                  <button
                      type="button"
                      className="diet-text-btn"
                      onClick={() =>
                          setIsDetailModalOpen(true)
                      }
                  >
                    상세 보기
                  </button>
                </div>

                <div className="diet-calorie-row">
                  <div>
                    <strong className="diet-current-kcal">
                      {Number(
                          todayTotalCalories
                      ).toLocaleString()}
                      <span> kcal</span>
                    </strong>

                    <span className="diet-target-kcal">
                    목표{' '}
                      {Number(
                          targetCalories
                      ).toLocaleString()}
                      kcal
                  </span>
                  </div>

                  <span className="diet-calorie-percent">
                  {caloriePercent}%
                </span>
                </div>

                <div className="diet-progress-track">
                <span
                    className="diet-progress-bar"
                    style={{
                      width: `${caloriePercent}%`,
                    }}
                />
                </div>

                <div className="diet-macro-summary">

                  <div className="diet-macro-item">
                  <span>
                    탄수화물
                  </span>

                    <strong>
                      {todayCarbs}g
                    </strong>

                    <small>
                      {carbsPercent}%
                    </small>
                  </div>

                  <div className="diet-macro-item protein">
                  <span>
                    단백질
                  </span>

                    <strong>
                      {todayProtein}g
                    </strong>

                    <small>
                      {Math.round(
                          effectiveProteinRate
                      )}
                      %
                    </small>
                  </div>

                  <div className="diet-macro-item">
                  <span>
                    지방
                  </span>

                    <strong>
                      {todayFat}g
                    </strong>

                    <small>
                      {fatPercent}%
                    </small>
                  </div>

                  <div className="diet-macro-item">
                  <span>
                    식이섬유
                  </span>

                    <strong>
                      {fiberDetail?.currentAmount ||
                          0}
                      g
                    </strong>

                    <small>
                      {fiberPercent}%
                    </small>
                  </div>
                </div>
              </section>

              {/* 알레르기 */}

              {hasAllergyWarning && (
                  <section className="diet-allergy-card">
                    <div className="diet-allergy-icon">
                      !
                    </div>

                    <div>
                      <strong>
                        알레르기 주의
                      </strong>

                      <p>
                        {warningFoodName}
                      </p>

                      <span>
                    감지 성분:{' '}
                        {detectedAllergens.join(
                            ', '
                        )}
                  </span>
                    </div>
                  </section>
              )}

              {/* 오늘 식단 기록 */}

              <section className="diet-card">

                <div className="diet-card-header">
                  <div>
                  <span className="diet-card-eyebrow">
                    TODAY
                  </span>

                    <h3>
                      오늘의 식단 기록
                    </h3>
                  </div>

                  <div className="diet-view-mode-btns">
                    <button
                        type="button"
                        className={
                          viewMode === 'DAILY'
                              ? 'active'
                              : ''
                        }
                        onClick={() =>
                            setViewMode('DAILY')
                        }
                    >
                      일간
                    </button>

                    <button
                        type="button"
                        className={
                          viewMode === 'WEEKLY'
                              ? 'active'
                              : ''
                        }
                        onClick={() =>
                            setViewMode('WEEKLY')
                        }
                    >
                      주간
                    </button>

                    <button
                        type="button"
                        className={
                          viewMode === 'MONTHLY'
                              ? 'active'
                              : ''
                        }
                        onClick={() =>
                            setViewMode('MONTHLY')
                        }
                    >
                      월간
                    </button>
                  </div>
                </div>

                {viewMode !== 'DAILY' && (
                    <div className="diet-period-notice">
                      주간/월간 분석은 다음 단계에서
                      최근 기록 기반 분석과 연결할
                      예정입니다.
                    </div>
                )}

                <div className="diet-meal-grid">
                  {todayRecords.length > 0 ? (
                      todayRecords.map(
                          (record) => (
                              <article
                                  key={record.recordId}
                                  className="diet-meal-box"
                              >
                                <div className="diet-meal-title">
                          <span className="diet-meal-badge">
                            {record.mealType}
                          </span>

                                  <span className="diet-meal-time">
                            {record.time
                                ? record.time.substring(
                                    0,
                                    5
                                )
                                : ''}
                          </span>
                                </div>

                                <p className="diet-meal-desc">
                                  {record.foodName}
                                </p>

                                <div className="diet-meal-bottom">
                                  <div className="diet-meal-protein">
                            <span>
                              단백질
                            </span>

                                    <strong>
                                      {Number(
                                          record.protein ||
                                          0
                                      ).toFixed(
                                          1
                                      )}
                                      g
                                    </strong>
                                  </div>

                                  <div className="diet-meal-kcal">
                                    {record.calories}
                                    <span>
                              kcal
                            </span>
                                  </div>
                                </div>
                              </article>
                          )
                      )
                  ) : (
                      <div className="diet-empty-state">
                        <strong>
                          아직 오늘의 식단 기록이
                          없습니다.
                        </strong>

                        <span>
                      식사를 기록하면 단백질과
                      영양 섭취량을 바로 확인할 수
                      있어요.
                    </span>

                        <button
                            type="button"
                            className="diet-btn diet-btn--primary"
                            onClick={() =>
                                setIsManualModalOpen(
                                    true
                                )
                            }
                        >
                          첫 식단 기록하기
                        </button>
                      </div>
                  )}
                </div>
              </section>

              {/* 레시피 */}

              <section className="diet-card">

                <div className="diet-card-header">
                  <div>
                  <span className="diet-card-eyebrow">
                    MEAL IDEAS
                  </span>

                    <h3>
                      식단 아이디어
                    </h3>
                  </div>
                </div>

                <div className="diet-recipe-grid">
                  {dietRecipes.map(
                      (recipe) => (
                          <button
                              type="button"
                              className="diet-recipe-card"
                              key={recipe.id}
                              onClick={() =>
                                  setActiveVideoId(
                                      recipe.videoId
                                  )
                              }
                          >
                            <div className="diet-recipe-image">
                              <img
                                  src={`https://img.youtube.com/vi/${recipe.videoId}/hqdefault.jpg`}
                                  alt={recipe.title}
                              />

                              <span className="diet-recipe-play">
                          ▶
                        </span>
                            </div>

                            <div className="diet-recipe-content">
                              <strong>
                                {recipe.title}
                              </strong>

                              <span>
                          {recipe.channel}
                        </span>
                            </div>
                          </button>
                      )
                  )}
                </div>
              </section>
            </div>

            {/* =============================================== */}
            {/* Right */}
            {/* =============================================== */}

            <aside className="diet-right-panel">

              {/* 영양 상태 */}

              <section className="diet-card">

              <span className="diet-card-eyebrow">
                NUTRITION STATUS
              </span>

                <h3 className="diet-side-title">
                  영양 섭취 상태
                </h3>

                <div className="diet-nutrient-details">

                  <NutrientRow
                      label="단백질"
                      current={todayProtein}
                      target={
                        effectiveProteinTarget
                      }
                      status={
                        proteinDetail?.status
                      }
                      color={getStatusColor(
                          proteinDetail?.status
                      )}
                      highlight
                  />

                  <NutrientRow
                      label="탄수화물"
                      current={todayCarbs}
                      target={
                        carbsDetail?.targetAmount
                      }
                      status={
                        carbsDetail?.status
                      }
                      color={getStatusColor(
                          carbsDetail?.status
                      )}
                  />

                  <NutrientRow
                      label="지방"
                      current={todayFat}
                      target={
                        fatDetail?.targetAmount
                      }
                      status={
                        fatDetail?.status
                      }
                      color={getStatusColor(
                          fatDetail?.status
                      )}
                  />

                  <NutrientRow
                      label="식이섬유"
                      current={
                          fiberDetail?.currentAmount ||
                          0
                      }
                      target={
                          fiberDetail?.targetAmount ||
                          0
                      }
                      status={
                        fiberDetail?.status
                      }
                      color={getStatusColor(
                          fiberDetail?.status
                      )}
                  />

                  <NutrientRow
                      label="나트륨"
                      current={
                          sodiumDetail?.currentAmount ||
                          0
                      }
                      target={
                          sodiumDetail?.targetAmount ||
                          0
                      }
                      status={
                        sodiumDetail?.status
                      }
                      color={getStatusColor(
                          sodiumDetail?.status
                      )}
                      unit="mg"
                  />
                </div>
              </section>

              {/* 추천 목표 */}

              <section className="diet-card">

                <div className="diet-card-header">
                  <div>
                  <span className="diet-card-eyebrow">
                    DAILY GOAL
                  </span>

                    <h3>
                      현재 영양 목표
                    </h3>
                  </div>
                </div>

                <div className="diet-goals-grid">

                  <div className="diet-goal-card diet-goal-card--primary">
                  <span>
                    단백질 목표
                  </span>

                    <strong>
                      {effectiveProteinTarget}
                      <small>g</small>
                    </strong>
                  </div>

                  <div className="diet-goal-card">
                  <span>
                    권장 칼로리
                  </span>

                    <strong>
                      {Number(
                          targetCalories
                      ).toLocaleString()}
                      <small>kcal</small>
                    </strong>
                  </div>

                  <div className="diet-goal-card">
                  <span>
                    탄수화물
                  </span>

                    <strong>
                      {carbsDetail?.targetAmount ||
                          0}
                      <small>g</small>
                    </strong>
                  </div>

                  <div className="diet-goal-card">
                  <span>
                    지방
                  </span>

                    <strong>
                      {fatDetail?.targetAmount ||
                          0}
                      <small>g</small>
                    </strong>
                  </div>
                </div>

                <div className="diet-target-weight">
                <span>
                  체중 목표
                </span>

                  <strong>
                    {targetWeight} kg
                  </strong>
                </div>
              </section>

              {/* 오늘 단백질 기록 요약 */}

              <section className="diet-card diet-protein-record-card">

              <span className="diet-card-eyebrow">
                PROTEIN LOG
              </span>

                <h3 className="diet-side-title">
                  오늘 단백질 기록
                </h3>

                <div className="diet-protein-record-value">
                  <strong>
                    {recordedProteinTotal.toFixed(
                        1
                    )}
                    g
                  </strong>

                  <span>
                  {todayRecords.length}개 식사 기록
                </span>
                </div>

                <p>
                  기록되지 않은 식사는 0g으로
                  판단하지 않습니다. 기록된 식단을
                  기준으로만 섭취량을 계산합니다.
                </p>
              </section>

              {/* 알레르기 등록 정보 */}

              {registeredAllergies.length > 0 && (
                  <section className="diet-card">
                <span className="diet-card-eyebrow">
                  ALLERGY
                </span>

                    <h3 className="diet-side-title">
                      등록된 알레르기
                    </h3>

                    <div className="diet-allergy-tags">
                      {registeredAllergies.map(
                          (allergy) => (
                              <span key={allergy}>
                        {allergy}
                      </span>
                          )
                      )}
                    </div>
                  </section>
              )}
            </aside>
          </div>
        </div>

        {/* ================================================= */}
        {/* Nutrition Detail Modal */}
        {/* ================================================= */}

        {isDetailModalOpen && (
            <div
                className="diet-modal-bg"
                onClick={() =>
                    setIsDetailModalOpen(false)
                }
            >
              <div
                  className="diet-modal-box"
                  onClick={(event) =>
                      event.stopPropagation()
                  }
              >
                <div className="diet-modal-header">
                  <div>
                <span className="diet-card-eyebrow">
                  TODAY
                </span>

                    <h3>
                      오늘의 영양 요약
                    </h3>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          setIsDetailModalOpen(false)
                      }
                  >
                    ×
                  </button>
                </div>

                <div className="diet-detail-summary">
                  <div>
                <span>
                  단백질
                </span>

                    <strong>
                      {todayProtein} /{' '}
                      {effectiveProteinTarget}g
                    </strong>

                    <small>
                      {Math.round(
                          effectiveProteinRate
                      )}
                      %
                    </small>
                  </div>

                  <div>
                <span>
                  총 섭취
                </span>

                    <strong>
                      {Number(
                          todayTotalCalories
                      ).toLocaleString()}{' '}
                      /{' '}
                      {Number(
                          targetCalories
                      ).toLocaleString()}
                      kcal
                    </strong>

                    <small>
                      {caloriePercent}%
                    </small>
                  </div>

                  <div>
                <span>
                  탄수화물
                </span>

                    <strong>
                      {todayCarbs} /{' '}
                      {carbsDetail?.targetAmount ||
                          0}
                      g
                    </strong>
                  </div>

                  <div>
                <span>
                  지방
                </span>

                    <strong>
                      {todayFat} /{' '}
                      {fatDetail?.targetAmount ||
                          0}
                      g
                    </strong>
                  </div>
                </div>

                <div className="diet-modal-note">
                  단백질은 감량 중 중요한 지표지만
                  단백질 섭취량 하나만으로 식사의 질을
                  판단하지 않습니다. 총 에너지와 다른
                  영양소도 함께 확인하세요.
                </div>

                <button
                    type="button"
                    className="diet-btn diet-btn--primary diet-modal-confirm"
                    onClick={() =>
                        setIsDetailModalOpen(false)
                    }
                >
                  확인
                </button>
              </div>
            </div>
        )}

        {/* ================================================= */}
        {/* Manual Input Modal */}
        {/* ================================================= */}

        {isManualModalOpen && (
            <div
                className="diet-modal-bg"
                onClick={
                  handleCloseManualModal
                }
            >
              <div
                  className="diet-modal-box diet-record-modal"
                  onClick={(event) =>
                      event.stopPropagation()
                  }
              >
                <div className="diet-modal-header">
                  <div>
                <span className="diet-card-eyebrow">
                  NEW MEAL
                </span>

                    <h3>
                      식단 기록
                    </h3>
                  </div>

                  <button
                      type="button"
                      onClick={
                        handleCloseManualModal
                      }
                  >
                    ×
                  </button>
                </div>

                <div className="diet-form-group">
                  <label>
                    식사 구분
                  </label>

                  <select
                      name="mealType"
                      value={
                        recordForm.mealType
                      }
                      onChange={
                        handleFormChange
                      }
                  >
                    <option value="아침">
                      아침
                    </option>

                    <option value="점심">
                      점심
                    </option>

                    <option value="저녁">
                      저녁
                    </option>

                    <option value="간식">
                      간식
                    </option>

                    <option value="기타">
                      기타
                    </option>
                  </select>
                </div>

                <div className="diet-form-group">
                  <label>
                    음식명
                  </label>

                  <input
                      type="text"
                      name="foodName"
                      placeholder="예: 닭가슴살 볶음밥"
                      value={
                        recordForm.foodName
                      }
                      onChange={
                        handleFormChange
                      }
                  />
                </div>

                <div className="diet-form-highlight">
                  <label>
                    단백질
                    <span>
                  핵심 기록
                </span>
                  </label>

                  <div className="diet-input-with-unit">
                    <input
                        type="number"
                        min="0"
                        step="0.1"
                        name="protein"
                        value={
                          recordForm.protein
                        }
                        onChange={
                          handleFormChange
                        }
                    />

                    <span>
                  g
                </span>
                  </div>
                </div>

                <div className="diet-form-grid">

                  <div className="diet-form-group">
                    <label>
                      칼로리
                    </label>

                    <div className="diet-input-with-unit">
                      <input
                          type="number"
                          min="0"
                          name="calories"
                          value={
                            recordForm.calories
                          }
                          onChange={
                            handleFormChange
                          }
                      />

                      <span>
                    kcal
                  </span>
                    </div>
                  </div>

                  <div className="diet-form-group">
                    <label>
                      탄수화물
                    </label>

                    <div className="diet-input-with-unit">
                      <input
                          type="number"
                          min="0"
                          step="0.1"
                          name="carbs"
                          value={
                            recordForm.carbs
                          }
                          onChange={
                            handleFormChange
                          }
                      />

                      <span>
                    g
                  </span>
                    </div>
                  </div>

                  <div className="diet-form-group">
                    <label>
                      지방
                    </label>

                    <div className="diet-input-with-unit">
                      <input
                          type="number"
                          min="0"
                          step="0.1"
                          name="fat"
                          value={
                            recordForm.fat
                          }
                          onChange={
                            handleFormChange
                          }
                      />

                      <span>
                    g
                  </span>
                    </div>
                  </div>
                </div>

                <div className="diet-modal-actions">
                  <button
                      type="button"
                      className="diet-btn diet-btn--secondary"
                      onClick={
                        handleCloseManualModal
                      }
                  >
                    취소
                  </button>

                  <button
                      type="button"
                      className="diet-btn diet-btn--primary"
                      onClick={
                        handleManualSubmit
                      }
                  >
                    기록 저장
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* ================================================= */}
        {/* Video Modal */}
        {/* ================================================= */}

        {activeVideoId && (
            <div
                className="diet-modal-bg"
                onClick={() =>
                    setActiveVideoId(null)
                }
            >
              <div
                  className="diet-video-modal"
                  onClick={(event) =>
                      event.stopPropagation()
                  }
              >
                <button
                    type="button"
                    className="diet-video-close"
                    onClick={() =>
                        setActiveVideoId(null)
                    }
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
      </div>
  );
};


// =========================================================
// 영양소 행
// =========================================================

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
              Math.round(
                  (Number(current) /
                      Number(target)) *
                  100
              ),
              100
          )
          : 0;

  return (
      <div
          className={`diet-nutrient-item ${
              highlight
                  ? 'diet-nutrient-item--highlight'
                  : ''
          }`}
      >
        <div className="diet-nutrient-head">
          <div>
          <span
              className={`diet-dot ${color}`}
          />

            <strong>
              {label}
            </strong>
          </div>

          <span
              className={`diet-status ${color}`}
          >
          {status}
        </span>
        </div>

        <div className="diet-nutrient-amount">
          <strong>
            {current}
          </strong>

          <span>
          / {target} {unit}
        </span>
        </div>

        <div className="diet-n-bar-bg">
        <span
            className="diet-n-bar-fill"
            style={{
              width: `${percent}%`,
            }}
        />
        </div>
      </div>
  );
};


export default DietManagement;