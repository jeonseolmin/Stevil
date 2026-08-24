import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './Community.css';
import axiosInstance from '../../api/axiosInstance'; 
import * as XLSX from 'xlsx';

const CommunityEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [writeCategory, setWriteCategory] = useState('자유');
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  const [imagePreviews, setImagePreviews] = useState({});
  const [excelPreviews, setExcelPreviews] = useState({});
  const [loadingPreviews, setLoadingPreviews] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [externalLink, setExternalLink] = useState('');
  const [allowComment, setAllowComment] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [autoSource, setAutoSource] = useState(true);

  // 파일 용량 단위를 KB, MB, GB로 자동 변환하는 함수
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const fetchPostDetail = async () => {
      try {
        const response = await axiosInstance.get(`/community/${id}`);
        const data = response.data;
        
        setTitle(data.title);
        setContent(data.content);
        setWriteCategory(data.category || '자유');
        
        setExternalLink(data.externalLink || '');
        setAllowComment(data.allowComment ?? true);
        setAllowCopy(data.allowCopy ?? true);
        setAutoSource(data.autoSource ?? true);

        // 기존에 등록되어 있던 파일들이 있다면 수정 화면에서도 유지해서 보여주기
        if (data.files && data.files.length > 0) {
          const existingFiles = data.files.map((file, idx) => ({
            id: `server-${idx}-${file.originalFileName}`,
            file: null, // 서버에 이미 저장된 파일은 File 객체가 없으므로 null
            name: file.originalFileName,
            size: file.fileSize || 0,
            url: `http://localhost:8080${file.fileUrl}`
          }));
          setSelectedFiles(existingFiles);

          // 서버 파일들의 기존 이미지/엑셀 미리보기 처리
          existingFiles.forEach((item, idx) => {
            const isImage = item.name.match(/\.(jpeg|jpg|gif|png)$/i) != null;
            const isExcel = item.name.match(/\.(xlsx|xls|csv)$/i) != null;

            if (isImage) {
              setImagePreviews(prev => ({ ...prev, [item.id]: item.url }));
            } else if (isExcel) {
              loadServerExcelPreview(item.url, item.id, item.name);
            }
          });
        }

      } catch (error) {
        alert("게시글 정보를 불러올 수 없습니다.");
        navigate('/community');
      }
    };
    fetchPostDetail();
  }, [id, navigate]);

  const loadServerExcelPreview = async (fileUrl, fileId, fileName) => {
    setLoadingPreviews(prev => ({ ...prev, [fileId]: true }));
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      let workbook;
      if (fileName.toLowerCase().endsWith('.csv')) {
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
      
      setExcelPreviews(prev => ({ ...prev, [fileId]: jsonData.slice(0, 15) }));
    } catch (error) {
      console.error("서버 엑셀 미리보기 로드 실패:", error);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [fileId]: false }));
    }
  };

  const processFiles = async (newFiles) => {
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'xlsx', 'xls', 'csv', 'txt', 'pdf', 'docx', 'doc', 'ppt', 'pptx'];
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB

    const validFiles = [];

    Array.from(newFiles).forEach(file => {
      const fileExtension = file.name.split('.').pop().toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        alert(`[${file.name}] 업로드가 불가능한 파일 형식입니다.`);
        return;
      }

      if (file.size > MAX_SIZE) {
        alert(`[${file.name}] 파일 용량은 500MB를 초과할 수 없습니다.`);
        return;
      }

      validFiles.push({
        id: `new-${file.lastModified}-${file.name}-${Math.random()}`,
        file: file,
        name: file.name,
        size: file.size
      });
    });

    if (validFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(item => {
      generatePreview(item.file, item.id);
    });
  };

  const generatePreview = async (file, fileId) => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImagePreviews(prev => ({ ...prev, [fileId]: url }));
    } 
    else if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setLoadingPreviews(prev => ({ ...prev, [fileId]: true }));
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
        setExcelPreviews(prev => ({ ...prev, [fileId]: jsonData.slice(0, 15) }));
      } catch (error) {
        console.error("엑셀/CSV 파싱 에러:", error);
      } finally {
        setLoadingPreviews(prev => ({ ...prev, [fileId]: false }));
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (idToRemove) => {
    setSelectedFiles(prev => prev.filter(item => item.id !== idToRemove));
    setImagePreviews(prev => { const next = {...prev}; delete next[idToRemove]; return next; });
    setExcelPreviews(prev => { const next = {...prev}; delete next[idToRemove]; return next; });
  };

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };

  const handleUpdatePost = async () => {
    if (isSubmitting) return;
    if (!title.trim() || !content.trim()) return alert("제목과 내용을 입력해주세요.");

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('category', writeCategory);
      
      formData.append('allowComment', allowComment);
      formData.append('allowCopy', allowCopy);
      formData.append('autoSource', autoSource);
      formData.append('externalLink', externalLink);
      
      selectedFiles.forEach(item => {
        if (item.file) {
          formData.append('file', item.file);
        }
      });

      await axiosInstance.post(`/community/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('게시글이 성공적으로 수정되었습니다.');
      navigate(`/community/${id}`); 
    } catch (error) {
      console.error("글 수정 실패", error);
      alert(error.response?.data || "글 수정에 실패했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ste-community-wrapper">
      <div className="ste-container">
        <header className="ste-header">
          <div>
            <h1 className="ste-title">게시글 수정</h1>
            <p className="ste-subtitle">작성하신 글과 설정을 수정할 수 있습니다.</p>
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
            <label>외부 링크 첨부</label>
            <input 
              type="text" 
              placeholder="http:// 또는 https:// 로 시작하는 링크를 입력하세요." 
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

          <div className="ste-form-group">
            <label>첨부파일 다중 관리 (최대 500MB)</label>
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
                  multiple
                  accept=".png,.jpg,.jpeg,.xlsx,.xls,.csv,.txt,.pdf,.docx,.doc,.ppt,.pptx"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
                <label htmlFor="file-upload" className="ste-btn-secondary small">파일 추가</label>
                <span className="ste-file-name">
                  이곳에 새로운 파일을 드래그하거나 버튼을 클릭하세요.
                </span>
              </div>

              {selectedFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', marginTop: '20px' }}>
                  {selectedFiles.map(item => (
                    <div key={item.id} style={{ background: '#fff', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '16px', boxShadow: 'var(--shadow-small)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--color-text-primary)' }}>
                          {item.name} <span style={{ color: 'var(--color-text-muted)', fontWeight: '600' }}>({formatFileSize(item.size)})</span>
                        </span>
                        <button className="ste-file-clear-btn" onClick={() => handleRemoveFile(item.id)}>삭제</button>
                      </div>

                      {imagePreviews[item.id] && (
                        <div style={{ marginTop: '12px', textAlign: 'center', background: 'var(--color-surface-soft)', padding: '10px', borderRadius: '8px' }}>
                          <img src={imagePreviews[item.id]} alt="미리보기" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '6px' }} />
                        </div>
                      )}

                      {loadingPreviews[item.id] && (
                        <div style={{ marginTop: '12px', padding: '12px', textAlign: 'center', background: 'var(--color-surface-soft)', borderRadius: '8px', color: 'var(--color-primary)', fontWeight: '800' }}>
                          파일을 읽고 미리보기를 생성하는 중입니다...
                        </div>
                      )}

                      {excelPreviews[item.id] && !loadingPreviews[item.id] && (
                        <div style={{ marginTop: '12px', width: '100%', borderRadius: '8px', border: '1px solid var(--color-border-light)', overflow: 'hidden' }}>
                          <div style={{ padding: '8px 12px', background: 'var(--color-surface-soft)', borderBottom: '1px solid var(--color-border-light)', fontSize: '13px', fontWeight: '800', color: 'var(--color-text-secondary)' }}>
                            데이터 미리보기 (상위 15줄)
                          </div>
                          <div style={{ overflowX: 'auto', padding: '12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
                              <tbody>
                                {excelPreviews[item.id].map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    {row.map((cell, colIdx) => (
                                      <td key={colIdx} style={{ border: '1px solid var(--color-border-light)', padding: '6px 10px', background: rowIdx === 0 ? 'var(--color-surface-soft)' : '#fff', fontWeight: rowIdx === 0 ? '700' : 'normal', color: 'var(--color-text-primary)' }}>
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
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="ste-form-actions">
            <button className="ste-btn-secondary" onClick={() => navigate(`/community/${id}`)} disabled={isSubmitting}>취소</button>
            <button 
              className="ste-btn-primary" 
              onClick={handleUpdatePost} 
              disabled={isSubmitting}
              style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
            >
              {isSubmitting ? '수정 중...' : '수정하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityEdit;