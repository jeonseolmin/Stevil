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
    
    // 드롭된 파일 가져오기
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

  const handleSavePost = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', writeCategory);
      formData.append('isNotice', false);
      
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
          {/* 드래그 앤 드롭 UI 적용 구역 */}
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