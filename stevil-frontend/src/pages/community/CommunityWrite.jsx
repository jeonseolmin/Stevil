import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance'; 
import * as XLSX from 'xlsx';

const CommunityWrite = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('자유');
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [imagePreview, setImagePreview] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null);

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [externalLink, setExternalLink] = useState('');
  const [allowComment, setAllowComment] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [autoSource, setAutoSource] = useState(true);

  const [showVote, setShowVote] = useState(false);
  const [voteTitle, setVoteTitle] = useState('');
  const [voteOptions, setVoteOptions] = useState(['', '']);
  const [allowMultipleVote, setAllowMultipleVote] = useState(false);

  const processFile = async (file) => {
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'xlsx', 'xls', 'csv', 'txt', 'pdf', 'docx', 'doc', 'ppt', 'pptx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      alert(`업로드가 불가능한 파일 형식입니다.\n허용: 이미지 및 일반 문서 파일 (png, jpg, xlsx, txt 등)\n차단: 프로그램 및 압축 파일 (exe, zip 등)`);
      clearFile();
      return;
    }

    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`파일 용량은 500MB를 초과할 수 없습니다. (현재 파일: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      clearFile();
      return;
    }

    setSelectedFile(file);
    setImagePreview(null);
    setExcelPreview(null);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } 
    else if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setIsPreviewLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        let workbook;

        if (file.name.toLowerCase().endsWith('.csv')) {
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
        setExcelPreview(jsonData.slice(0, 15)); 
      } catch (error) {
        console.error("엑셀/CSV 파싱 에러:", error);
        alert("파일을 읽는 중 오류가 발생했습니다.");
      } finally {
        setIsPreviewLoading(false);
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const onDragEnter = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
  };
  const onDragOver = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setExcelPreview(null);
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
      alert(error.response?.data || "글 작성에 실패했습니다.");
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

          <div className="ste-form-group">
            <label>링크 첨부</label>
            <input 
              type="text" 
              placeholder="http:// 또는 https://로 시작하는 링크를 입력하세요." 
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
            />
          </div>

          <div className="ste-form-group">
            <label>게시글 부가 설정</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', padding: '10px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '15px' }}>
                <input type="checkbox" checked={allowComment} onChange={(e) => setAllowComment(e.target.checked)} style={{ width: '18px', height: '18px', margin: 0 }} /> 댓글 허용
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '15px' }}>
                <input type="checkbox" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} style={{ width: '18px', height: '18px', margin: 0 }} /> 복사/저장 허용
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '15px' }}>
                <input type="checkbox" checked={autoSource} onChange={(e) => setAutoSource(e.target.checked)} style={{ width: '18px', height: '18px', margin: 0 }} /> 자동 출처 남기기
              </label>              
            </div>
          </div>

          <div className="ste-form-group" style={{ background: 'var(--color-surface-soft)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showVote ? '15px' : '0' }}>
              <label style={{ margin: 0, fontWeight: '800', fontSize: '16px' }}>투표 기능</label>
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
                
                <button className="ste-text-btn" onClick={handleAddVoteOption} style={{ marginTop: '5px', color: 'var(--color-primary-dark)' }}>+ 항목 추가</button>

                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed var(--color-border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>
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

          <div className="ste-form-group">
            <label>첨부파일 (최대 500MB)</label>
            <div 
              className={`ste-file-upload-wrapper ${isDragging ? 'dragging' : ''}`}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDragOver={onDragOver}
              onDrop={onDrop}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="ste-file-input" 
                  accept=".png,.jpg,.jpeg,.xlsx,.xls,.csv,.txt,.pdf,.docx,.doc,.ppt,.pptx"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
                <label htmlFor="file-upload" className="ste-btn-secondary small">파일 찾기</label>
                <span className="ste-file-name">
                  {selectedFile 
                    ? `${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)` 
                    : '이곳에 파일을 드래그하거나 버튼을 클릭하세요.'}
                </span>
                {selectedFile && (
                  <button className="ste-file-clear-btn" onClick={clearFile}>삭제</button>
                )}
              </div>

              {imagePreview && (
                <div style={{ marginTop: '16px', width: '100%', textAlign: 'center', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <img src={imagePreview} alt="미리보기" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '6px' }} />
                </div>
              )}

              {/* 엑셀/CSV 로딩 중 상태 표시 */}
              {isPreviewLoading && (
                <div style={{ marginTop: '16px', width: '100%', padding: '16px', textAlign: 'center', background: 'var(--color-surface-soft)', borderRadius: '8px', border: '1px solid var(--color-border)', color: 'var(--color-primary)', fontWeight: '800' }}>
                  파일을 읽고 미리보기를 생성하는 중입니다...
                </div>
              )}

              {excelPreview && !isPreviewLoading && (
                <div style={{ marginTop: '16px', width: '100%', background: '#fff', borderRadius: '8px', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border)', fontSize: '13px', fontWeight: '700', color: 'var(--color-text-secondary)' }}>
                    데이터 미리보기 (상위 15줄)
                  </div>
                  <div style={{ overflowX: 'auto', padding: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      <tbody>
                        {excelPreview.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, colIdx) => (
                              <td key={colIdx} style={{ border: '1px solid var(--color-border-light)', padding: '8px 12px', background: rowIdx === 0 ? 'var(--color-surface-soft)' : '#fff', fontWeight: rowIdx === 0 ? '700' : 'normal' }}>
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