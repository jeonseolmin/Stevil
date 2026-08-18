import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance';

const CommunityList = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [posts, setPosts] = useState([]);

  const categories = [
    { id: 'ALL', label: '전체' },
    { id: '자유', label: '자유게시판' },
    { id: '정보', label: '꿀팁/정보' },
    { id: '질문', label: '질문/답변' },
  ];

  useEffect(() => {
    fetchPosts();
  }, [selectedCategory]);

  const fetchPosts = async () => {
    try {
      const params = {
        page: 0,
        size: 10,
        category: selectedCategory === 'ALL' ? '' : selectedCategory
      };

      if (searchKeyword.trim()) {
        params.keyword = searchKeyword;
        params.searchType = 'title';
      }

      const response = await axiosInstance.get('/community', { params });
      setPosts(response.data.content || response.data);
    } catch (error) {
      console.error("게시글 조회 실패", error);
      setPosts([]);
    }
  };

  return (
    <div className="ste-community-wrapper">
      <div className="ste-container">
        <header className="ste-header">
          <div>
            <h1 className="ste-title">커뮤니티</h1>
            <p className="ste-subtitle">건강한 정보와 일상을 나누는 공간입니다.</p>
          </div>
          <button className="ste-btn-primary" onClick={() => navigate('/community/write')}>
            새 글 쓰기
          </button>
        </header>

        <div className="ste-card">
          <div className="ste-toolbar">
            <div className="ste-tabs">
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  className={`ste-tab ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(cat.id); setSearchKeyword(''); }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="ste-search">
              <input 
                type="text" 
                placeholder="검색어를 입력하세요" 
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPosts()}
              />
              <button onClick={fetchPosts}>검색</button>
            </div>
          </div>

          <div className="ste-table">
            <div className="ste-th">
              <span className="col-cat">분류</span>
              <span className="col-title">제목</span>
              <span className="col-author">작성자</span>
              <span className="col-date">작성일</span>
            </div>
            
            {posts.map(post => (
              <div key={post.id} className="ste-tr" onClick={() => navigate(`/community/${post.id}`)}>
                <span className="col-cat">
                  <span className={`ste-badge ${post.category || '자유'}`}>{post.category || '자유'}</span>
                </span>
                <span className="col-title">{post.title}</span>
                <span className="col-author">{post.author || '익명'}</span>
                <span className="col-date">{post.createdAt ? post.createdAt.substring(0, 10) : ''}</span>
              </div>
            ))}
            {posts.length === 0 && <div className="ste-empty">등록된 게시글이 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityList;