import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance';
import * as XLSX from 'xlsx';

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

  const [selectedOptions, setSelectedOptions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);

  const [excelPreviews, setExcelPreviews] = useState({});
  const [loadingPreviews, setLoadingPreviews] = useState({});

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchPostDetail();
    fetchComments();
    fetchVoteStatus();
  }, [id]);

  useEffect(() => {
    if (currentPost && currentPost.files) {
      currentPost.files.forEach((file, idx) => {
        const isExcel = file.originalFileName.match(/\.(xlsx|xls|csv)$/i) != null;
        if (isExcel && !excelPreviews[idx]) {
          loadExcelPreview(file, idx);
        }
      });
    }
  }, [currentPost]);

  const loadExcelPreview = async (file, idx) => {
    setLoadingPreviews(prev => ({ ...prev, [idx]: true }));
    try {
      const fileUrl = `http://localhost:8080${file.fileUrl}`;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      let workbook;
      if (file.originalFileName.toLowerCase().endsWith('.csv')) {
        let csvText = "";
        try {
          csvText = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch (e) {
          csvText = new TextDecoder('euc-kr').decode(buffer);
        }
        workbook = XLSX.read(csvText, { type: 'string', sheetRows: 15 });
      } else {
        workbook = XLSX.read(buffer, { type: 'array', sheetRows: 15 });
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      setExcelPreviews(prev => ({
        ...prev,
        [idx]: jsonData.slice(0, 15) 
      }));
    } catch (error) {
      console.error("엑셀 미리보기 로드 실패:", error);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [idx]: false }));
    }
  };

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

  const handleVoteOptionSelect = (optionId) => {
    if (!currentPost.vote.allowMultiple) {
      setSelectedOptions([optionId]);
    } else {
      if (selectedOptions.includes(optionId)) {
        setSelectedOptions(selectedOptions.filter(id => id !== optionId));
      } else {
        setSelectedOptions([...selectedOptions, optionId]);
      }
    }
  };

  const fetchVoteStatus = async () => {
    try {
      const response = await axiosInstance.get(`/community/${id}/vote/check`);
      const votedIds = response.data;
      
      if (votedIds && votedIds.length > 0) {
        setHasVoted(true);           
        setSelectedOptions(votedIds); 
      }
    } catch (error) {
      console.error("투표 상태 확인 실패", error);
    }
  };
  
  const handleSubmitVote = async () => {
    if (selectedOptions.length === 0) return alert("투표할 항목을 선택해주세요.");
    try {
      await axiosInstance.post(`/community/${id}/vote`, { optionIds: selectedOptions });
      alert("투표가 완료되었습니다.");
      
      fetchPostDetail(); 
      fetchVoteStatus(); 
    } catch (error) {
      alert(error.response?.data || "투표 처리 중 오류가 발생했습니다.");
    }
  };

  const handleCopy = (e) => {
    if (currentPost.allowCopy === false) {
      e.preventDefault();
      alert("이 게시글은 작성자에 의해 복사가 금지되어 있습니다.");
      return;
    }
    
    if (currentPost.autoSource) {
      const selection = document.getSelection();
      if (selection.toString().length > 0) {
        e.preventDefault();
        const sourceText = `\n\n출처: Stevil 커뮤니티 - ${window.location.href}`;
        e.clipboardData.setData('text/plain', selection.toString() + sourceText);
      }
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
          
          <div 
            className="ste-body"
            style={currentPost.allowCopy === false ? { userSelect: 'none' } : {}}
            onContextMenu={currentPost.allowCopy === false ? (e) => e.preventDefault() : undefined}
            onCopy={handleCopy}
          >
            {currentPost.content}
          </div>

          {currentPost.externalLink && (
            <div className="ste-external-link" style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ marginRight: '10px' }}><strong>링크 :</strong></span>
              <a 
                href={currentPost.externalLink.startsWith('http') ? currentPost.externalLink : `https://${currentPost.externalLink}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ color: '#0ea5e9', textDecoration: 'underline', wordBreak: 'break-all' }}
              >
                {currentPost.externalLink}
              </a>
            </div>
          )}

          {currentPost.vote && (
            <div className="ste-vote-container" style={{ marginTop: '30px', padding: '25px', background: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '5px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 {currentPost.vote.title}
              </h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                {currentPost.vote.allowMultiple ? '다중 선택 가능' : '단일 선택'}
              </p>

              <div className="ste-vote-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentPost.vote.options.map(option => {
                  const totalVotes = currentPost.vote.options.reduce((sum, opt) => sum + opt.voteCount, 0);
                  const percent = totalVotes === 0 ? 0 : Math.round((option.voteCount / totalVotes) * 100);
                  
                  return (
                    <div 
                      key={option.id} 
                      onClick={() => !hasVoted && handleVoteOptionSelect(option.id)}
                      style={{ 
                        position: 'relative', padding: '12px 16px', borderRadius: '8px', 
                        border: selectedOptions.includes(option.id) ? '2px solid #0ea5e9' : '1px solid #cbd5e1',
                        cursor: hasVoted ? 'default' : 'pointer', overflow: 'hidden',
                        background: selectedOptions.includes(option.id) ? '#f0f9ff' : '#fff',
                      }}
                    >
                      {hasVoted && (
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percent}%`, background: '#e0f2fe', zIndex: 1, transition: 'width 0.5s ease' }}></div>
                      )}
                      
                      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {!hasVoted && (
                            <input 
                              type={currentPost.vote.allowMultiple ? "checkbox" : "radio"} 
                              checked={selectedOptions.includes(option.id)}
                              readOnly
                              style={{ width: '16px', height: '16px', margin: 0 }}
                            />
                          )}
                          <span style={{ fontWeight: selectedOptions.includes(option.id) ? 'bold' : 'normal' }}>
                            {option.content}
                          </span>
                        </div>
                        {hasVoted && (
                          <span style={{ fontSize: '14px', color: '#0ea5e9', fontWeight: 'bold' }}>
                            {percent}% ({option.voteCount}명)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!hasVoted && (
                <button className="ste-btn-primary" onClick={handleSubmitVote} style={{ width: '100%', marginTop: '20px', padding: '12px' }}>
                  투표하기
                </button>
              )}
            </div>
          )}

          {/* 여러 개의 첨부파일 목록 순회 및 용량/미리보기 표시 */}
          {currentPost.files && currentPost.files.length > 0 && (
            <div className="ste-post-files" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
              {currentPost.files.map((file, idx) => {
                const isImage = file.originalFileName.match(/\.(jpeg|jpg|gif|png)$/i) != null;
                const isExcel = file.originalFileName.match(/\.(xlsx|xls|csv)$/i) != null; 
                const fileDownloadUrl = `http://localhost:8080${file.fileUrl}`; 
                const fileSizeFormatted = formatFileSize(file.fileSize || file.size);
                
                return (
                  <div key={idx} className="ste-file-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    
                    {/* 이미지 미리보기 */}
                    {isImage && (
                      <div style={{ marginBottom: '14px', textAlign: 'center' }}>
                        <img 
                          src={fileDownloadUrl} 
                          alt={file.originalFileName} 
                          className="ste-post-image" 
                          style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
                        />
                      </div>
                    )}

                    {/* 엑셀/CSV 로딩 상태 표시 */}
                    {isExcel && loadingPreviews[idx] && (
                      <div style={{ marginBottom: '12px', padding: '16px', textAlign: 'center', background: '#fff', borderRadius: '8px', color: '#0d9488', fontWeight: 'bold' }}>
                        ⏳ 데이터를 분석하여 미리보기를 생성하는 중입니다...
                      </div>
                    )}

                    {/* 엑셀 파일 미리보기 표 렌더링 */}
                    {isExcel && !loadingPreviews[idx] && excelPreviews[idx] && (
                      <div style={{ marginBottom: '14px', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                          데이터 미리보기 (상위 15줄)
                        </div>
                        <div style={{ overflowX: 'auto', padding: '12px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
                            <tbody>
                              {excelPreviews[idx].map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                  {row.map((cell, colIdx) => (
                                    <td key={colIdx} style={{ border: '1px solid #e2e8f0', padding: '6px 10px', background: rowIdx === 0 ? '#f8fafc' : '#fff', fontWeight: rowIdx === 0 ? 'bold' : 'normal', color: '#1e293b' }}>
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* 다운로드 버튼 및 용량 표시 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <button 
                        onClick={() => handleFileDownload(fileDownloadUrl, file.originalFileName)} 
                        className="ste-file-link"
                        style={{ cursor: 'pointer', textAlign: 'left', display: 'inline-block' }}
                      >
                        첨부파일 다운로드: {file.originalFileName}
                      </button>
                      {fileSizeFormatted && (
                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                          용량: {fileSizeFormatted}
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          <div className="ste-like-zone" style={{ margin: '40px 0', textAlign: 'center' }}>
            <button className="ste-like-btn" onClick={handleToggleLike}>
              공감하기 ({currentPost.likeCount || 0})
            </button>
          </div>

          {currentPost.allowComment !== false && (
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
          )}

          <div className="ste-footer-btns">
            <button className="ste-btn-secondary" onClick={() => navigate('/community')}>목록으로</button>
          </div>
        </div>
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

export default CommunityDetail;