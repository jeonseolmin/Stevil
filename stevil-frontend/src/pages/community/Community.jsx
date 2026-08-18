import { useState, useEffect } from 'react';
import './Community.css';
import axiosInstance from '../../api/axiosInstance.js';

const Community = () => {
  const [viewMode, setViewMode] = useState('LIST'); 
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const [posts, setPosts] = useState([]);
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]); 
  const [newComment, setNewComment] = useState(''); 

  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState('POST'); 
  const [reportTargetId, setReportTargetId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('자유');

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

  const handlePostClick = async (postId) => {
    try {
      const postRes = await axiosInstance.get(`/community/${postId}`);
      setCurrentPost(postRes.data);

      const commentRes = await axiosInstance.get(`/community/${postId}/comments`);
      setComments(commentRes.data);
      
      setViewMode('DETAIL');
    } catch (error) {
      console.error("상세 조회 실패", error);
      alert("게시글을 불러올 수 없습니다.");
    }
  };

  const handleSavePost = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', writeCategory);
      formData.append('isNotice', false);

      await axiosInstance.post('/community', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('게시글이 성공적으로 등록되었습니다.');
      setTitle(''); setContent(''); setWriteCategory('자유');
      setViewMode('LIST');
      fetchPosts(); 
    } catch (error) {
      console.error("글 작성 실패", error);
      alert("글 작성에 실패했습니다.");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return alert("댓글 내용을 입력해주세요.");

    try {
      await axiosInstance.post(`/community/${currentPost.id}/comments`, {
        content: newComment,
        parentId: null
      });
      
      setNewComment('');
      refreshComments();
    } catch (error) {
      console.error("댓글 작성 실패", error);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyContent.trim()) return alert("답글 내용을 입력해주세요.");

    try {
      await axiosInstance.post(`/community/${currentPost.id}/comments`, {
        content: replyContent,
        parentId: parentId
      });
      
      setReplyContent('');
      setReplyingCommentId(null);
      refreshComments();
    } catch (error) {
      console.error("답글 작성 실패", error);
    }
  };

  const refreshComments = async () => {
    const commentRes = await axiosInstance.get(`/community/${currentPost.id}/comments`);
    setComments(commentRes.data);
  };

  const handleToggleLike = async () => {
    try {
      const response = await axiosInstance.post(`/community/${currentPost.id}/like`);
      const isLiked = response.data; 
      
      setCurrentPost(prev => ({
        ...prev,
        likeCount: isLiked ? (prev.likeCount || 0) + 1 : (prev.likeCount || 1) - 1
      }));
    } catch (error) {
      console.error("좋아요 처리 실패", error);
    }
  };

  const openReportModal = (type, id) => {
    setReportTargetType(type); 
    setReportTargetId(id);
    setReportReason('');
    setIsReportModalOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return alert("신고 사유를 입력해주세요.");

    try {
      await axiosInstance.post('/reports', {
        targetType: reportTargetType,
        targetId: reportTargetId,
        category: 'ETC',
        reason: reportReason
      });
      alert('신고가 정상적으로 접수되었습니다.');
      setIsReportModalOpen(false);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        alert(error.response.data);
      } else {
        alert('신고 처리 중 오류가 발생했습니다.');
      }
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
          {viewMode === 'LIST' && (
            <button className="ste-btn-primary" onClick={() => setViewMode('WRITE')}>
              새 글 쓰기
            </button>
          )}
        </header>

        {viewMode === 'LIST' && (
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
                <div key={post.id} className="ste-tr" onClick={() => handlePostClick(post.id)}>
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
        )}

        {viewMode === 'DETAIL' && currentPost && (
          <div className="ste-card">
            <div className="ste-detail-top">
              <span className={`ste-badge ${currentPost.category || '자유'}`}>{currentPost.category || '자유'}</span>
              <h2>{currentPost.title}</h2>
              <div className="ste-meta">
                <span className="author">{currentPost.author || '익명'}</span>
                <span className="dot">·</span>
                <span>{currentPost.createdAt ? currentPost.createdAt.substring(0, 10) : ''}</span>
                <span className="dot">·</span>
                <span>조회수 {currentPost.viewCount || 0}</span>
                <div className="right-action">
                  <button className="ste-text-btn danger" onClick={() => openReportModal('POST', currentPost.id)}>
                    신고
                  </button>
                </div>
              </div>
            </div>
            
            <div className="ste-body">
              {currentPost.content}
            </div>

            <div className="ste-like-zone">
              <button className="ste-like-btn" onClick={handleToggleLike}>
                공감하기 ({currentPost.likeCount || 0})
              </button>
            </div>

            <div className="ste-comment-area">
              <h3>댓글 ({comments.length})</h3>
              
              {/* 메인 댓글 입력창 */}
              <div className="ste-comment-input-wrapper">
                <textarea 
                  placeholder="따뜻한 댓글을 남겨주세요."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                ></textarea>
                <div className="ste-comment-input-footer">
                  <button className="ste-btn-primary small" onClick={handleAddComment}>등록</button>
                </div>
              </div>
              
              <div className="ste-comment-list">
                {comments.map(comment => {
                  const isReply = comment.parentId !== null;
                  return (
                    <div key={comment.id} className={`ste-comment-item ${isReply ? 'is-reply' : ''}`}>
                      <div className="comment-header">
                        <span className="author">{isReply ? '↳ ' : ''}{comment.author || '익명'}</span>
                        <span className="date">{comment.createdAt}</span>
                      </div>
                      
                      <div className="comment-body">
                        {comment.content}
                      </div>

                      <div className="comment-actions">
                        {!isReply && (
                          <button className="action-btn" onClick={() => setReplyingCommentId(replyingCommentId === comment.id ? null : comment.id)}>
                            답글 달기
                          </button>
                        )}
                        <button className="action-btn danger" onClick={() => openReportModal('COMMENT', comment.id)}>신고</button>
                      </div>

                      {/* 대댓글(답글) 입력창 */}
                      {replyingCommentId === comment.id && (
                        <div className="ste-comment-input-wrapper reply-mode">
                          <textarea 
                            placeholder="답글을 남겨주세요."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                          ></textarea>
                          <div className="ste-comment-input-footer">
                            <button className="ste-btn-secondary small" onClick={() => setReplyingCommentId(null)}>취소</button>
                            <button className="ste-btn-primary small" onClick={() => handleAddReply(comment.id)}>답글 등록</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ste-footer-btns">
              <button className="ste-btn-secondary" onClick={() => setViewMode('LIST')}>목록으로</button>
            </div>
          </div>
        )}

        {viewMode === 'WRITE' && (
          <div className="ste-card">
            <h3>새 게시글 작성</h3>
            <div className="ste-form-group">
              <label>카테고리</label>
              <select value={writeCategory} onChange={(e) => setWriteCategory(e.target.value)}>
                <option value="자유">자유게시판</option>
                <option value="정보">꿀팁/정보</option>
                <option value="질문">질문/답변</option>
              </select>
            </div>
            <div className="ste-form-group">
              <label>제목</label>
              <input 
                type="text" 
                placeholder="제목을 입력해주세요." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="ste-form-group">
              <label>내용</label>
              <textarea 
                className="ste-textarea"
                placeholder="내용을 입력해주세요."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
            </div>
            <div className="ste-form-actions">
              <button className="ste-btn-secondary" onClick={() => setViewMode('LIST')}>취소</button>
              <button className="ste-btn-primary" onClick={handleSavePost}>등록하기</button>
            </div>
          </div>
        )}
      </div>

      {isReportModalOpen && (
        <div className="ste-modal-bg">
          <div className="ste-modal-box">
            <h3>콘텐츠 신고</h3>
            <p>규정에 위반되는 콘텐츠인지 확인 후 운영자에게 전달됩니다.</p>
            <textarea 
              placeholder="신고 사유를 상세히 입력해주세요 (예: 욕설, 비방, 광고 등)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            ></textarea>
            <div className="ste-modal-btns">
              <button className="ste-btn-secondary" onClick={() => setIsReportModalOpen(false)}>취소</button>
              <button className="ste-btn-danger" onClick={submitReport}>신고 접수</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;