// src/components/home/HeroSection.jsx

import React, { useState } from 'react';
import './HeroSection.css';

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    console.log(`'${searchQuery}' 검색 요청!`);
    alert('검색을 시작합니다.');
  };

  return (
    <section className="hero-section-simple">
      <div className="hero-content-simple">
        <h1 className="hero-title-simple">어디로 가시나요?</h1>

        {/* 검색창 영역 */}
        <div className="search-bar-simple">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="여행지, 즐길거리, 호텔 등" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="search-submit-btn" onClick={handleSearch}>
            검색
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;