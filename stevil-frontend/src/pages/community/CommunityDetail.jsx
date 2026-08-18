import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance';

const CommunityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [currentPost, setCurrentPost] = useState(null);
  const [comments, setComments] = useState([]); 
  const [newComment, setNewComment] = useState(''); 
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportTargetType, setReportTargetType] = useState('POST'); 
  const [reportTargetId, setReportTargetId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    fetchPostDetail();
    fetchComments();
  }, [id]);

  const fetchPostDetail = async () => {
    try {
      const response = await axiosInstance.get(`/community/${id}`);
      setCurrentPost(response.data);
    } catch (error) {
      alert("게시글을 불러올 수 없습니다.");
      navigate('/community');
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axiosInstance.get(`/community/${id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error("댓글 조회 실패", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return alert("댓글 내용을 입력해주세요.");
    try {
      await axiosInstance.post(`/community/${id}/comments`, { content: newComment, parentId: null });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error("댓글 작성 실패", error);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyContent.trim()) return alert("답글 내용을 입력해주세요.");
    try {
      await axiosInstance.post(`/community/${id}/comments`, { content: replyContent, parentId });
      setReplyContent('');
      setReplyingCommentId(null);
      fetchComments();
    } catch (error) {
      console.error("답글 작성 실패", error);
    }
  };

  const handleDeletePost = async () => {
    if (window.confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      try {
        await axiosInstance.delete(`/community/${id}`);
        alert('삭제되었습니다.');
        navigate('/community');
      } catch (error) {
        alert(error.response?.data || "삭제 권한이 없거나 실패했습니다.");
      }
    }
  };

  const handleToggleLike = async () => {
    try {
      const response = await axiosInstance.post(`/community/${id}/like`);
      setCurrentPost(prev => ({
        ...prev,
        likeCount: response.data ? prev.likeCount + 1 : prev.likeCount - 1
      }));
    } catch (error) {
      console.error("좋아요 처리 실패", error);
    }
  };

  const handleFileDownload = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("다운로드 실패:", error);
      alert("파일을 다운로드하는 중 오류가 발생했습니다.");
    }
  };

  const openReportModal = (type, targetId) => {
    setReportTargetType(type); 
    setReportTargetId(targetId);
    setReportReason('');
    setIsReportModalOpen(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return alert("신고 사유를 입력해주세요.");
    try {
      await axiosInstance.post('/reports', {
        targetType: reportTargetType, targetId: reportTargetId, category: 'ETC', reason: reportReason
      });
      alert('신고가 정상적으로 접수되었습니다.');
      setIsReportModalOpen(false);
    } catch (error) {
      alert('신고 처리 중 오류가 발생했습니다.');
    }
  };

  if (!currentPost) return <div className="ste-community-wrapper">로딩중...</div>;

  return (
    <div className="ste-community-wrapper">
      <div className="ste-container">
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
                <button className="ste-text-btn" onClick={() => navigate(`/community/edit/${id}`)}>수정</button>
                <span className="dot" style={{margin: '0 8px'}}>·</span>
                <button className="ste-text-btn danger" onClick={handleDeletePost}>삭제</button>
                <span className="dot" style={{margin: '0 8px'}}>·</span>
                <button className="ste-text-btn danger" onClick={() => openReportModal('POST', currentPost.id)}>신고</button>
              </div>
            </div>
          </div>
          
          <div className="ste-body">
            {currentPost.content}
          </div>

          {/* 파일 다운로드 및 이미지 렌더링 영역 */}
          {currentPost.files && currentPost.files.length > 0 && (
            <div className="ste-post-files">
              {currentPost.files.map((file, idx) => {
                const isImage = file.originalFileName.match(/\.(jpeg|jpg|gif|png)$/i) != null;
                // 스프링부트 백엔드 주소 (포트에 맞게 확인)
                const fileDownloadUrl = `http://localhost:8080${file.fileUrl}`; 
                
                return (
                  <div key={idx} className="ste-file-item" style={{ marginBottom: '20px' }}>
                    
                    {/* 1. 이미지일 경우 먼저 사진을 보여줌 */}
                    {isImage && (
                      <div style={{ marginBottom: '10px' }}>
                        <img 
                          src={fileDownloadUrl} 
                          alt={file.originalFileName} 
                          className="ste-post-image" 
                          style={{ maxWidth: '100%', borderRadius: '8px' }}
                        />
                      </div>
                    )}

                    {/* 2. 이미지 여부와 상관없이 모든 파일에 대해 다운로드 버튼 노출 */}
                    <button 
                      onClick={() => handleFileDownload(fileDownloadUrl, file.originalFileName)} 
                      className="ste-file-link"
                      style={{ cursor: 'pointer', textAlign: 'left', display: 'inline-block' }}
                    >
                      첨부파일 다운로드: {file.originalFileName}
                    </button>
                    
                  </div>
                );
              })}
            </div>
          )}

          <div className="ste-like-zone">
            <button className="ste-like-btn" onClick={handleToggleLike}>
              공감하기 ({currentPost.likeCount || 0})
            </button>
          </div>

          <div className="ste-comment-area">
            <h3>댓글 ({comments.length})</h3>
            
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
            <button className="ste-btn-secondary" onClick={() => navigate('/community')}>목록으로</button>
          </div>
        </div>
      </div>
      
      {/* 완전히 구현된 신고 모달 창 */}
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

export default CommunityDetail;