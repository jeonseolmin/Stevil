import { useState } from 'react';
import './DietManagement.css';

const DietManagement = () => {
  const [keyword, setKeyword] = useState('');
  const [viewMode, setViewMode] = useState('DAILY'); // 일간, 주간, 월간 탭
  const [showVideo, setShowVideo] = useState(null); // 재생할 유튜브 비디오 ID

  // 더미 데이터 (추후 백엔드 API 연동)
  const allergyAlert = "견과류";
  const selectedFoodAllergy = "견과류 샐러드";

  const recipes = [
    { id: '1', videoId: 'e207Xq4A-08', title: '고단백 샐러드', tags: ['단백질 ↑', '저칼로리'] },
    { id: '2', videoId: '54zJ7D9Ept0', title: '저당 도시락', tags: ['저당', '포만감 ↑'] },
    { id: '3', videoId: 'xPPLbEFbCAo', title: '단백질 스무디', tags: ['단백질 ↑', '간편식'] }
  ];

  const recentFoods = [
    { name: '현미밥', amount: '1공기 (210g)', kcal: 310 },
    { name: '닭가슴살 샐러드', amount: '1인분 (250g)', kcal: 320 },
    { name: '두부된장국', amount: '1그릇 (250g)', kcal: 150 }
  ];

  const favoriteFoods = [
    { name: '아보카도 샐러드', amount: '1인분', kcal: 280 },
    { name: '그릭요거트', amount: '100g', kcal: 100 },
    { name: '닭가슴살 구이', amount: '100g', kcal: 180 }
  ];

  return (
    <div className="diet-web-container">
      {/* 1. 상단 헤더 & 검색/등록 */}
      <header className="diet-header">
        <div className="header-title">
          <h2>식단 관리</h2>
          <p>알레르기와 영양을 함께 관리하세요.</p>
        </div>
        <div className="action-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="음식명 검색" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <button className="action-btn photo-btn">📷 사진 등록</button>
          <button className="action-btn manual-btn">✏️ 직접 입력</button>
        </div>
      </header>

      {/* 2. 메인 대시보드 그리드 */}
      <div className="diet-grid">
        
        {/* 좌측 패널 */}
        <div className="left-panel">
          
          {/* 오늘 섭취 칼로리 */}
          <div className="diet-card">
            <div className="card-header-flex">
              <h3>오늘 섭취 칼로리</h3>
              <span className="link-text">상세 보기 &gt;</span>
            </div>
            <div className="calorie-display">
              <span className="current-kcal">1,280 <span>kcal</span></span>
              <span className="target-kcal"> / 목표 1,800 kcal</span>
            </div>
            <div className="progress-bar-container">
              <div className="progress-bar-bg"><div className="progress-bar-fill blue" style={{ width: '71%' }}></div></div>
              <span className="percent-text">71%</span>
            </div>
            <div className="macro-summary">
              <div className="macro-item">
                <span className="macro-label">탄수화물 162g</span>
                <span className="macro-percent" style={{color: '#3498db'}}>55%</span>
              </div>
              <div className="macro-item">
                <span className="macro-label">단백질 72g</span>
                <span className="macro-percent" style={{color: '#2ecc71'}}>57%</span>
              </div>
              <div className="macro-item">
                <span className="macro-label">지방 38g</span>
                <span className="macro-percent" style={{color: '#95a5a6'}}>34%</span>
              </div>
            </div>
          </div>

          {/* 알레르기 주의 경고창 */}
          {allergyAlert && (
            <div className="allergy-alert-card">
              <div className="allergy-header">
                <span className="alert-icon">⚠️</span> <strong>알레르기 주의</strong>
              </div>
              <div className="allergy-content">
                <div className="registered-allergy">
                  <span>등록된 알레르기</span>
                  <div className="tags">
                    <span className="tag red-tag">갑각류</span>
                    <span className="tag red-tag">{allergyAlert}</span>
                  </div>
                </div>
                <div className="detected-allergy">
                  <p>선택한 음식 : {selectedFoodAllergy}</p>
                  <div className="warning-msg">알레르기 유발 성분 포함: {allergyAlert}</div>
                </div>
              </div>
            </div>
          )}

          {/* 오늘의 식단 기록 */}
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
              <div className="meal-box">
                <div className="meal-title">☀️ 아침 <span>08:00</span></div>
                <p className="meal-desc">오트밀, 바나나, 요거트, 블루베리</p>
                <div className="meal-kcal">320 <span>kcal</span></div>
              </div>
              <div className="meal-box">
                <div className="meal-title">🌤️ 점심 <span>12:30</span></div>
                <p className="meal-desc">현미밥, 닭가슴살, 샐러드</p>
                <div className="meal-kcal">520 <span>kcal</span></div>
              </div>
              <div className="meal-box">
                <div className="meal-title">🌙 저녁 <span>19:00</span></div>
                <p className="meal-desc">고등어구이, 잡곡밥, 김치</p>
                <div className="meal-kcal">360 <span>kcal</span></div>
              </div>
              <div className="meal-box">
                <div className="meal-title">🍰 간식 <span>15:30</span></div>
                <p className="meal-desc">그릭요거트, 견과류</p>
                <div className="meal-kcal">80 <span>kcal</span></div>
              </div>
            </div>
          </div>

          {/* 다이어트 식단 레시피 (유튜브 연동) */}
          <div className="diet-card">
            <div className="card-header-flex">
              <h3>다이어트 식단 레시피</h3>
              <span className="link-text">전체 보기 &gt;</span>
            </div>
            <div className="recipe-scroll">
              {recipes.map(recipe => (
                <div key={recipe.id} className="recipe-card" onClick={() => setShowVideo(recipe.videoId)}>
                  {/* 유튜브 썸네일 이미지 불러오기 */}
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

        {/* 우측 패널 */}
        <div className="right-panel">
          
          {/* 영양 섭취 요약 */}
          <div className="diet-card">
            <h3>영양 섭취 요약</h3>
            <div className="nutrient-bars">
              <div className="nutrient-bar-row">
                <span className="n-label">탄수화물</span>
                <div className="n-bar-bg"><div className="n-bar-fill" style={{width: '90%', background: '#3498db'}}></div></div>
              </div>
              <div className="nutrient-bar-row">
                <span className="n-label">단백질</span>
                <div className="n-bar-bg"><div className="n-bar-fill" style={{width: '100%', background: '#2ecc71'}}></div></div>
              </div>
              <div className="nutrient-bar-row">
                <span className="n-label">지방</span>
                <div className="n-bar-bg"><div className="n-bar-fill" style={{width: '60%', background: '#95a5a6'}}></div></div>
              </div>
            </div>
            
            <hr className="divider"/>
            
            <div className="nutrient-details">
              <div className="detail-row"><span className="dot green"></span> 단백질 <span className="val">72.0 / 55 g</span> <span className="status green">적정</span></div>
              <div className="detail-row"><span className="dot orange"></span> 식이섬유 <span className="val">12.4 / 25 g</span> <span className="status orange">부족</span></div>
              <div className="detail-row"><span className="dot green"></span> 칼슘 <span className="val">721 / 750 mg</span> <span className="status green">적정</span></div>
              <div className="detail-row"><span className="dot orange"></span> 비타민C <span className="val">68 / 100 mg</span> <span className="status orange">부족</span></div>
              <div className="detail-row"><span className="dot red"></span> 나트륨 <span className="val">2,450 / 1,500 mg</span> <span className="status red">과다</span></div>
            </div>
          </div>

          {/* 추천 영양 목표 */}
          <div className="diet-card">
            <div className="card-header-flex">
              <h3>추천 영양 목표 (개인 맞춤)</h3>
              <span className="link-text">목표 설정 &gt;</span>
            </div>
            <div className="goals-grid">
              <div className="goal-item">
                <span className="goal-icon blue">⚖️</span>
                <span className="goal-label">목표 체중</span>
                <strong>63 kg</strong>
              </div>
              <div className="goal-item">
                <span className="goal-icon orange">🔥</span>
                <span className="goal-label">권장 칼로리</span>
                <strong>1,800 kcal</strong>
              </div>
              <div className="goal-item">
                <span className="goal-icon green">💪</span>
                <span className="goal-label">단백질 목표</span>
                <strong>90 g</strong>
              </div>
              <div className="goal-item">
                <span className="goal-icon green">🌿</span>
                <span className="goal-label">식이섬유</span>
                <strong>25 g</strong>
              </div>
            </div>
          </div>

          {/* 최근 먹은 음식 & 즐겨찾기 (하단 2분할) */}
          <div className="food-list-container">
            <div className="diet-card flex-1">
              <div className="card-header-flex">
                <h3>최근 먹은 음식</h3>
                <span className="link-text">전체 보기 &gt;</span>
              </div>
              <ul className="food-list">
                {recentFoods.map((food, idx) => (
                  <li key={idx}>
                    <div>
                      <strong>{food.name}</strong>
                      <span>{food.amount}</span>
                    </div>
                    <div className="food-right">
                      <span>{food.kcal} kcal</span>
                      <span className="star-icon">☆</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="diet-card flex-1">
              <div className="card-header-flex">
                <h3>즐겨찾기</h3>
                <span className="link-text">전체 보기 &gt;</span>
              </div>
              <ul className="food-list">
                {favoriteFoods.map((food, idx) => (
                  <li key={idx}>
                    <div>
                      <strong>{food.name}</strong>
                      <span>{food.amount}</span>
                    </div>
                    <div className="food-right">
                      <span>{food.kcal} kcal</span>
                      <span className="star-icon favorite">★</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* 유튜브 영상 재생 모달창 */}
      {showVideo && (
        <div className="video-modal-overlay" onClick={() => setShowVideo(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowVideo(null)}>X</button>
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${showVideo}?autoplay=1`} 
              frameBorder="0" 
              allow="autoplay; encrypted-media" 
              allowFullScreen
              title="Diet Recipe Video"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietManagement;