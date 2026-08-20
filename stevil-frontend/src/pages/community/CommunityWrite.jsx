import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance'; 

const CommunityWrite = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('자유');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // 링크 및 게시글 설정 옵션
  const [externalLink, setExternalLink] = useState('');
  const [allowComment, setAllowComment] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [autoSource, setAutoSource] = useState(true);

  const [showVote, setShowVote] = useState(false);
  const [voteTitle, setVoteTitle] = useState('');
  const [voteOptions, setVoteOptions] = useState(['', '']);
  const [allowMultipleVote, setAllowMultipleVote] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddVoteOption = () => {
    setVoteOptions([...voteOptions, '']);
  };

  const handleRemoveVoteOption = (index) => {
    setVoteOptions(voteOptions.filter((_, i) => i !== index));
  };

  const handleVoteOptionChange = (index, value) => {
    const newOptions = [...voteOptions];
    newOptions[index] = value;
    setVoteOptions(newOptions);
  };

  const handleSavePost = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', writeCategory);
      formData.append('isNotice', false);
      
      // 백엔드로 설정값 전송
      formData.append('allowComment', allowComment);
      formData.append('allowCopy', allowCopy);
      formData.append('autoSource', autoSource);
      formData.append('externalLink', externalLink);
      
      if (showVote) {
        if (!voteTitle.trim()) return alert("투표 제목을 입력해주세요.");
        const validOptions = voteOptions.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) return alert("투표 항목은 최소 2개 이상 입력해야 합니다.");

        formData.append('voteTitle', voteTitle);
        formData.append('allowMultipleVote', allowMultipleVote);
        validOptions.forEach(opt => formData.append('voteOptions', opt));
      }
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axiosInstance.post('/community', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('게시글이 성공적으로 등록되었습니다.');
      navigate('/community');
    } catch (error) {
      console.error("글 작성 실패", error);
      alert("글 작성에 실패했습니다.");
    }
  };

  return (
    <div className="ste-community-wrapper">
      <div className="ste-container">
        <header className="ste-header">
          <div>
            <h1 className="ste-title">새 게시글 작성</h1>
            <p className="ste-subtitle">타인을 비방하거나 불쾌감을 주는 글은 제재될 수 있습니다.</p>
          </div>
        </header>

        <div className="ste-card">
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

          {/* 링크 입력 구역 */}
          <div className="ste-form-group">
            <label>링크 첨부</label>
            <input 
              type="text" 
              placeholder="http:// 또는 https://로 시작하는 링크를 입력하세요." 
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
            />
          </div>

          {/* 게시글 설정 체크박스 구역 */}
          <div className="ste-form-group">
            <label>게시글 부가 설정</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', padding: '10px 0' }}>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '15px' }}>
                <input 
                  type="checkbox" 
                  checked={allowComment} 
                  onChange={(e) => setAllowComment(e.target.checked)} 
                  style={{ width: '18px', height: '18px', margin: 0 }}
                /> 댓글 허용
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '15px' }}>
                <input 
                  type="checkbox" 
                  checked={allowCopy} 
                  onChange={(e) => setAllowCopy(e.target.checked)} 
                  style={{ width: '18px', height: '18px', margin: 0 }}
                /> 복사/저장 허용
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '15px' }}>
                <input 
                  type="checkbox" 
                  checked={autoSource} 
                  onChange={(e) => setAutoSource(e.target.checked)} 
                  style={{ width: '18px', height: '18px', margin: 0 }}
                /> 자동 출처 남기기
              </label>              
            </div>
          </div>

          <div className="ste-form-group" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showVote ? '15px' : '0' }}>
              <label style={{ margin: 0, fontWeight: 'bold', fontSize: '16px' }}>투표 기능</label>
              <button className={`ste-btn-${showVote ? 'secondary' : 'primary'} small`} onClick={() => setShowVote(!showVote)}>
                {showVote ? '투표 취소' : '투표 추가하기'}
              </button>
            </div>

            {showVote && (
              <div className="ste-vote-setup">
                <input 
                  type="text" 
                  placeholder="투표 제목을 입력하세요 (예: 오늘 점심 뭐 먹을까요?)" 
                  value={voteTitle} 
                  onChange={(e) => setVoteTitle(e.target.value)} 
                  style={{ marginBottom: '15px', fontWeight: 'bold' }} 
                />
                
                {voteOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input 
                      type="text" 
                      placeholder={`항목 ${idx + 1}`} 
                      value={opt} 
                      onChange={(e) => handleVoteOptionChange(idx, e.target.value)} 
                      style={{ flex: 1 }}
                    />
                    {voteOptions.length > 2 && (
                      <button className="ste-btn-danger small" onClick={() => handleRemoveVoteOption(idx)}>삭제</button>
                    )}
                  </div>
                ))}
                
                <button className="ste-text-btn" onClick={handleAddVoteOption} style={{ marginTop: '5px', color: '#0ea5e9' }}>+ 항목 추가</button>

                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #cbd5e1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                    <input 
                      type="checkbox" 
                      checked={allowMultipleVote} 
                      onChange={(e) => setAllowMultipleVote(e.target.checked)} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    /> 
                    복수 선택 허용
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 기존 드래그 앤 드롭 UI 유지 */}
          <div className="ste-form-group">
            <label>첨부파일</label>
            <div 
              className={`ste-file-upload-wrapper ${isDragging ? 'dragging' : ''}`}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="ste-file-input" 
                onChange={handleFileChange}
                ref={fileInputRef}
              />
              <label htmlFor="file-upload" className="ste-btn-secondary small">파일 찾기</label>
              <span className="ste-file-name">
                {selectedFile 
                  ? selectedFile.name 
                  : '이곳에 파일을 드래그하거나 버튼을 클릭하세요.'}
              </span>
              {selectedFile && (
                <button className="ste-file-clear-btn" onClick={clearFile}>삭제</button>
              )}
            </div>
          </div>
          
          <div className="ste-form-actions">
            <button className="ste-btn-secondary" onClick={() => navigate('/community')}>취소</button>
            <button className="ste-btn-primary" onClick={handleSavePost}>등록하기</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityWrite;