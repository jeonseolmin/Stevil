import { useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import "./AttendingDoctorModal.css";

export default function AttendingDoctorModal({ onClose, onSuccess }) {
    const [doctorCode, setDoctorCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!doctorCode.trim()) {
            setError("의사 코드를 입력해주세요.");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            // 실제 API 호출 주소에 맞게 수정
            await axiosInstance.post("/users/me/attending-doctor", { doctorCode });
            alert("주치의 등록이 완료되었습니다! 이제 요약 리포트를 전송할 수 있습니다.");
            onSuccess(); 
        } catch (err) {
            setError(err.response?.data?.message || "유효하지 않은 코드이거나, 이미 등록된 상태입니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="doc-modal-overlay" onClick={onClose}>
            <div className="doc-modal-content" onClick={e => e.stopPropagation()}>
                <div className="doc-modal-header">
                    <h2>주치의 등록</h2>
                    <button className="doc-close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <p className="doc-modal-desc">
                    다니시는 병원에서 발급받은 <strong>의사 고유 코드</strong>를 입력해주세요.<br/>
                    등록 후 Stevil AI 건강 리포트를 전송할 수 있습니다.
                </p>
                
                <form onSubmit={handleSubmit} className="doc-modal-form">
                    <input 
                        type="text" 
                        placeholder="예: DOC-A1B2" 
                        value={doctorCode}
                        onChange={(e) => setDoctorCode(e.target.value.toUpperCase())} // 대문자 변환
                        className={error ? "input-error" : ""}
                    />
                    {error && <span className="doc-error-text">{error}</span>}
                    
                    <div className="doc-modal-actions">
                        <button type="button" className="doc-btn-cancel" onClick={onClose}>취소</button>
                        <button type="submit" className="doc-btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? "연결 중..." : "주치의 등록하기"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}