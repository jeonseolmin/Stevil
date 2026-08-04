// src/components/home/HomeContent.jsx
import React from 'react';
import './HomeContent.css';

import activityImg from '../../images/activity.jpg';
import cafeImg from '../../images/cafe.jpg';
import cultureImg from '../../images/culture.jpg';
import gwangjangImg from '../../images/gwangjang.jpg';
import healingImg from '../../images/healing.jpg';
import jejuImg from '../../images/jeju.jpg';
import kyungbokgungImg from '../../images/kyungbokgung.jpg';

const HomeContent = () => {
  // 1. 관심사 카테고리 (음식, 힐링, 액티비티, 문화활동)
  const categories = [
    { id: 1, title: '음식', img: 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: '힐링', img: healingImg }, // 자연 풍경
    { id: 3, title: '액티비티', img: activityImg}, // 패러글라이딩 등
    { id: 4, title: '문화활동', img: cultureImg }, // 궁궐, 전시
  ];

  // 2. 국내 인기 명소 맞춤 추천
  const recommendPlaces = [
    { id: 1, title: '경복궁 야간개장', rating: 4.9, reviews: 85210, category: '문화/역사', img: kyungbokgungImg },
    { id: 2, title: '제주 우도 자전거 여행', rating: 4.8, reviews: 62030, category: '액티비티', img: jejuImg },
    { id: 3, title: '광장시장 먹자골목', rating: 4.6, reviews: 112400, category: '음식', img: gwangjangImg },
    { id: 4, title: '강릉 안목해변 카페거리', rating: 4.7, reviews: 45012, category: '힐링/카페', img: cafeImg },
  ];

  // 3. SNS 핫플, 지역 축제 및 팝업스토어 (새로 추가됨)
  const timeLimitedEvents = [
    { id: 1, title: '성수동 레트로 감성 팝업', date: '이번 주 일요일 종료', location: '서울 성동구', img: 'https://images.unsplash.com/photo-1555529771-835f59bfc50c?auto=format&fit=crop&w=400&q=80' },
    { id: 2, title: '한강 달빛 야시장', date: '매주 금/토 운영', location: '반포 한강공원', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80' },
    { id: 3, title: '진해 군항제 (벚꽃 축제)', date: '3.25 - 4.05', location: '경남 창원시', img: 'https://images.unsplash.com/photo-1522201997457-9dbf97bd23d6?auto=format&fit=crop&w=400&q=80' },
    { id: 4, title: '더현대 서울 크리스마스 마켓', date: 'D-15', location: '서울 여의도', img: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=400&q=80' },
  ];

  return (
    <div className="home-content-container">
      
      {/* 1. 상단 프로모션 배너 */}
      <section className="promo-banner">
        <div className="promo-banner-text">
          <h2>당신의 취향에 딱 맞는 국내 여행지를 찾아보세요</h2>
          <p>전국의 숨겨진 명소부터 요즘 뜨는 핫플까지 한눈에!</p>
          <button className="promo-btn">일정 만들기</button>
        </div>
        <div className="promo-banner-img"></div>
      </section>

      {/* 2. 카테고리 섹션 */}
      <section className="content-section">
        <h3 className="section-title">어떤 여행을 원하시나요?</h3>
        <p className="section-subtitle">취향에 맞춰 일정을 최적화해 드립니다.</p>
        <div className="category-grid">
          {categories.map(item => (
            <div key={item.id} className="category-card" style={{ backgroundImage: `url(${item.img})` }}>
              <span className="category-title">{item.title}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 맞춤 추천 (국내 인기 명소) */}
      <section className="content-section">
        <h3 className="section-title">요즘 뜨는 인기 명소</h3>
        <p className="section-subtitle">다른 여행자들이 가장 많이 추가한 동선입니다.</p>
        <div className="place-grid">
          {recommendPlaces.map(place => (
            <div key={place.id} className="place-card">
              <div className="place-img-wrapper">
                <img src={place.img} alt={place.title} />
                <button className="heart-btn">♡</button>
              </div>
              <div className="place-info">
                <h4 className="place-title">{place.title}</h4>
                <div className="place-rating">
                  <span className="stars">★★★★★</span>
                  <span className="reviews">({place.reviews.toLocaleString()})</span>
                </div>
                <p className="place-category">{place.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. 기간 한정 이벤트 (팝업/축제) - 신규 추가 영역 */}
      <section className="content-section">
        <div className="section-header-flex">
          <div>
            <h3 className="section-title">SNS 핫플 & 지역 축제 🎪</h3>
            <p className="section-subtitle">지금 아니면 놓치는 기간 한정 이벤트를 일정에 쏙 넣어보세요.</p>
          </div>
        </div>
        <div className="place-grid">
          {timeLimitedEvents.map(event => (
            <div key={event.id} className="place-card event-card">
              <div className="place-img-wrapper">
                <img src={event.img} alt={event.title} />
                {/* 기간을 강조하는 배지 */}
                <div className="event-badge">{event.date}</div>
              </div>
              <div className="place-info">
                <h4 className="place-title">{event.title}</h4>
                <p className="place-category">📍 {event.location}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default HomeContent;