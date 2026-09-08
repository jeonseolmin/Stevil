import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance';

const CommunityList = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [posts, setPosts] = useState([]);

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const categories = [
    { id: 'ALL', label: '전체' },
    { id: '자유', label: '자유게시판' },
    { id: '정보', label: '꿀팁/정보' },
    { id: '질문', label: '질문/답변' },
  ];

  useEffect(() => {
    fetchPosts(currentPage);
  }, [selectedCategory, currentPage]);

  const fetchPosts = async (pageToFetch = currentPage) => {
    try {
      const params = {
        page: pageToFetch,
        size: 10,
        category: selectedCategory === 'ALL' ? '' : selectedCategory
      };

      if (searchKeyword.trim()) {
        params.keyword = searchKeyword;
        params.searchType = 'title';
      }

      const response = await axiosInstance.get('/community', { params });

      if (response.data && response.data.content) {
        setPosts(response.data.content);
        setTotalPages(response.data.totalPages);
      } else {
        setPosts(response.data || []);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("게시글 조회 실패", error);
      setPosts([]);
    }
  };

  const handleSearch = () => {
    setCurrentPage(0);
    fetchPosts(0);
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
                  onClick={() => { 
                    setSelectedCategory(cat.id); 
                    setSearchKeyword(''); 
                    setCurrentPage(0);
                  }}
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
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>검색</button>
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

          {totalPages > 0 && (
            <div className="ste-pagination">
              <button
                className="ste-page-nav-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                이전
              </button>

              <div className="ste-page-numbers">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    className={`ste-page-num-btn ${currentPage === i ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              <button
                className="ste-page-nav-btn"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                다음
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default CommunityList;