import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance'; 

const CommunityEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('자유');
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingFileName, setExistingFileName] = useState('');

  // 기존 게시글 정보 불러오기
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axiosInstance.get(`/community/${id}`);
        const post = res.data;
        setTitle(post.title);
        setContent(post.content);
        setWriteCategory(post.category);
        
        // 기존 첨부파일이 있다면 이름만 표시
        if (post.files && post.files.length > 0) {
          setExistingFileName(post.files[0].originalFileName);
        }
      } catch (error) {
        alert('게시글 정보를 불러올 수 없습니다.');
        navigate('/community');
      }
    };
    fetchPost();
  }, [id, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setExistingFileName(''); // 새 파일 선택 시 기존 파일명 가림
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setExistingFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdatePost = async () => {
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', writeCategory);
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await axiosInstance.post(`/community/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('게시글이 성공적으로 수정되었습니다.');
      navigate(`/community/${id}`);
    } catch (error) {
      console.error("수정 에러:", error);
      const errorMessage = error.response?.data?.message || (typeof error.response?.data === 'string' ? error.response.data : "수정 중 오류가 발생했습니다.");
      alert(errorMessage);
    }
  };

  // 드래그 앤 드롭 방지 (생략 가능하지만 일관성을 위해 유지)
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setExistingFileName('');
    }
  };

  return (
    <div className="ste-community-wrapper">
      <div className="ste-container">
        <header className="ste-header">
          <div>
            <h1 className="ste-title">게시글 수정</h1>
            <p className="ste-subtitle">수정할 내용을 작성해주세요.</p>
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          
          <div className="ste-form-group">
            <label>첨부파일</label>
            <div 
              className="ste-file-upload-wrapper"
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
              <label htmlFor="file-upload" className="ste-btn-secondary small">파일 변경</label>
              <span className="ste-file-name">
                {selectedFile 
                  ? selectedFile.name 
                  : existingFileName 
                    ? `기존 파일: ${existingFileName}` 
                    : '이곳에 새 파일을 드래그하거나 버튼을 클릭하세요.'}
              </span>
              {(selectedFile || existingFileName) && (
                <button className="ste-file-clear-btn" onClick={clearFile}>삭제</button>
              )}
            </div>
          </div>

          <div className="ste-form-group">
            <label>내용</label>
            <textarea 
              className="ste-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>
          <div className="ste-form-actions">
            <button className="ste-btn-secondary" onClick={() => navigate(`/community/${id}`)}>취소</button>
            <button className="ste-btn-primary" onClick={handleUpdatePost}>수정하기</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityEdit;