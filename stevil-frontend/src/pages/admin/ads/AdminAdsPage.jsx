import { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosInstance.js";
import "./AdminAdsPage.css";

const AD_TYPE_LABELS = {
    TOP_BANNER: "상단 배너 (메인 대시보드)",
    HIGHLIGHT: "리스트 강조 (시각적 하이라이트)",
    SEARCH_TOP: "검색 최상단 (지역 검색 고정)"
};

// 날짜 포맷 함수
const formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.split("T")[0];
};

export default function AdminAdsPage() {
    const [pendingAds, setPendingAds] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, adId: null });
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [adminFeedback, setAdminFeedback] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchPendingAds = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("/ads/admin/pending");
            setPendingAds(response.data);
        } catch (error) {
            console.error("광고 목록 조회 실패:", error);
            alert("목록을 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingAds();
    }, []);

    // 승인 모달 열기 (의사가 희망한 날짜를 기본값으로 세팅)
    const openApproveModal = (ad) => {
        if (ad.startDate && ad.endDate) {
            setStartDate(ad.startDate);
            setEndDate(ad.endDate);
        } else {
            // 희망 날짜가 없을 경우 기본값 (오늘 ~ 30일 뒤)
            const today = new Date();
            const nextMonth = new Date();
            nextMonth.setDate(today.getDate() + 30);
            setStartDate(today.toISOString().split("T")[0]);
            setEndDate(nextMonth.toISOString().split("T")[0]);
        }
        
        setModalConfig({ isOpen: true, type: "APPROVE", adId: ad.id });
    };

    const openRejectModal = (adId) => {
        setAdminFeedback("");
        setModalConfig({ isOpen: true, type: "REJECT", adId });
    };

    const closeModal = () => {
        setModalConfig({ isOpen: false, type: null, adId: null });
    };

    const handleApprove = async () => {
        if (!startDate || !endDate) {
            alert("노출 시작일과 종료일을 모두 지정해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.patch(`/ads/admin/${modalConfig.adId}/approve`, {
                startDate,
                endDate
            });
            alert("해당 광고가 승인되어 노출이 시작됩니다.");
            closeModal();
            fetchPendingAds();
        } catch (error) {
            console.error("승인 처리 에러:", error);
            alert("승인 처리 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!adminFeedback.trim()) {
            alert("반려 사유를 작성해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.patch(`/ads/admin/${modalConfig.adId}/reject`, {
                adminFeedback
            });
            alert("해당 광고가 반려 처리되었습니다.");
            closeModal();
            fetchPendingAds(); 
        } catch (error) {
            console.error("반려 처리 에러:", error);
            alert("반려 처리 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="admin-ads-page">
            <header className="admin-ads-heading">
                <div>
                    <span>PARTNERSHIP MANAGEMENT</span>
                    <h1>광고·제휴 관리</h1>
                    <p>의사(병원)들이 신청한 광고 제휴 내역을 검토하고 승인/반려합니다.</p>
                </div>
            </header>

            <div className="admin-ads-content">
                {loading ? (
                    <div className="loading-state">목록을 불러오는 중입니다...</div>
                ) : pendingAds.length === 0 ? (
                    <div className="empty-state">승인 대기 중인 광고 신청이 없습니다.</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>신청 정보</th>
                                <th>신청자 (의사/병원)</th>
                                <th>광고 유형</th>
                                <th>희망 노출 기간</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingAds.map((ad) => (
                                <tr key={ad.id}>
                                    <td>
                                        {/* 신청 번호와 신청일 표시 */}
                                        <div className="admin-ad-info">
                                            <strong>#{ad.id}</strong>
                                            <span className="admin-ad-date">{formatDate(ad.requestedAt)} 신청</span>
                                        </div>
                                    </td>
                                    <td>
                                        <strong>{ad.doctorName || "이름 없음"}</strong>
                                    </td>
                                    <td>
                                        <span className={`ad-type-badge ${ad.adType}`}>
                                            {AD_TYPE_LABELS[ad.adType] || ad.adType}
                                        </span>
                                    </td>
                                    <td>
                                        {/* 의사가 입력한 희망 노출 기간 표시 */}
                                        <div className="admin-ad-duration">
                                            {ad.startDate && ad.endDate 
                                                ? `${ad.startDate} ~ ${ad.endDate}` 
                                                : "기간 미지정"}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-action-buttons">
                                            <button 
                                                className="btn-approve"
                                                onClick={() => openApproveModal(ad)}
                                            >
                                                승인
                                            </button>
                                            <button 
                                                className="btn-reject"
                                                onClick={() => openRejectModal(ad.id)}
                                            >
                                                반려
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 모달 영역 */}
            {modalConfig.isOpen && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal">
                        <header className="modal-header">
                            <h2>{modalConfig.type === "APPROVE" ? "광고 노출 승인" : "광고 신청 반려"}</h2>
                            <button className="btn-close-modal" onClick={closeModal}>×</button>
                        </header>
                        
                        <div className="modal-body">
                            {modalConfig.type === "APPROVE" ? (
                                <>
                                    <p className="modal-desc">해당 광고의 노출 기간을 설정해주세요. <br/>(의사가 희망한 날짜가 기본으로 입력되어 있습니다.)</p>
                                    <div className="form-group">
                                        <label>노출 시작일</label>
                                        <input 
                                            type="date" 
                                            value={startDate} 
                                            onChange={(e) => setStartDate(e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>노출 종료일</label>
                                        <input 
                                            type="date" 
                                            value={endDate} 
                                            onChange={(e) => setEndDate(e.target.value)} 
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="modal-desc">신청자에게 전달될 반려 사유를 작성해주세요.</p>
                                    <div className="form-group">
                                        <label>반려 사유 (피드백)</label>
                                        <textarea 
                                            placeholder="예: 등록하신 병원 정보가 부족하여 승인이 어렵습니다."
                                            value={adminFeedback}
                                            onChange={(e) => setAdminFeedback(e.target.value)}
                                            rows="4"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <footer className="modal-footer">
                            <button className="btn-cancel" onClick={closeModal} disabled={isSubmitting}>
                                취소
                            </button>
                            <button 
                                className={`btn-confirm ${modalConfig.type === "APPROVE" ? "approve" : "reject"}`} 
                                onClick={modalConfig.type === "APPROVE" ? handleApprove : handleReject}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "처리 중..." : modalConfig.type === "APPROVE" ? "승인 완료" : "반려 완료"}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </section>
    );
}