import { useState, useEffect } from "react";
import axiosInstance from "../../../api/axiosInstance.js";
import "./DoctorAdApplyPage.css";

const AD_TYPE_LABELS = {
    TOP_BANNER: "메인 대시보드 상단 배너",
    HIGHLIGHT: "병원 리스트 시각적 강조",
    SEARCH_TOP: "지역 검색 최상단 고정"
};

const formatDate = (dateString) => {
    if (!dateString) return "";
    return dateString.split("T")[0];
};

export default function DoctorAdApplyPage() {
    const [adType, setAdType] = useState("TOP_BANNER");
    
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myAds, setMyAds] = useState([]);
    const [loadingAds, setLoadingAds] = useState(true);

    const fetchMyAds = async () => {
        try {
            const response = await axiosInstance.get("/ads/me");
            setMyAds(response.data);
        } catch (error) {
            console.error("내 광고 내역 불러오기 실패:", error);
        } finally {
            setLoadingAds(false);
        }
    };

    useEffect(() => {
        fetchMyAds();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!startDate || !endDate) {
            alert("희망하는 노출 시작일과 종료일을 모두 선택해주세요.");
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert("종료일이 시작일보다 빠를 수 없습니다.");
            return;
        }

        if (!window.confirm("해당 광고 제휴를 신청하시겠습니까? 관리자 승인 후 노출이 시작됩니다.")) return;

        setIsSubmitting(true);
        try {
            await axiosInstance.post("/ads/request", {
                adType: adType,
                startDate: startDate,
                endDate: endDate
            });
            alert("광고 제휴 신청이 완료되었습니다.");
            
            // 폼 초기화
            setStartDate("");
            setEndDate("");
            fetchMyAds();
        } catch (error) {
            alert(error.response?.data?.message ?? "광고 신청 처리 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="doctor-ad-page">
            <header className="doctor-ad-header">
                <div>
                    <span>PARTNERSHIP PROGRAM</span>
                    <h1>병원 광고·제휴 신청</h1>
                    <p>Stevil 플랫폼 상단 노출 및 광고를 통해 더 많은 환자와 연결되세요.</p>
                </div>
            </header>

            <div className="doctor-ad-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>광고 상품 선택</label>
                        <div className="ad-options">
                            <label className={`ad-option-card ${adType === "TOP_BANNER" ? "selected" : ""}`}>
                                <input type="radio" name="adType" value="TOP_BANNER" checked={adType === "TOP_BANNER"} onChange={(e) => setAdType(e.target.value)} />
                                <div>
                                    <strong>메인 대시보드 상단 배너</strong>
                                    <p>환자들의 메인 화면 최상단 롤링 배너에 병원 이미지가 단독 노출됩니다.</p>
                                </div>
                            </label>

                            <label className={`ad-option-card ${adType === "HIGHLIGHT" ? "selected" : ""}`}>
                                <input type="radio" name="adType" value="HIGHLIGHT" checked={adType === "HIGHLIGHT"} onChange={(e) => setAdType(e.target.value)} />
                                <div>
                                    <strong>병원 리스트 시각적 강조</strong>
                                    <p>병원 검색 리스트에서 금색 테두리와 하이라이트 효과가 적용됩니다.</p>
                                </div>
                            </label>

                            <label className={`ad-option-card ${adType === "SEARCH_TOP" ? "selected" : ""}`}>
                                <input type="radio" name="adType" value="SEARCH_TOP" checked={adType === "SEARCH_TOP"} onChange={(e) => setAdType(e.target.value)} />
                                <div>
                                    <strong>지역 검색 최상단 고정</strong>
                                    <p>환자가 해당 지역 병원을 검색할 때 무조건 1순위로 고정 노출됩니다.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>희망 노출 기간</label>
                        <div className="date-input-group">
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                min={new Date().toISOString().split("T")[0]} // 오늘 이전 날짜 선택 방지
                            />
                            <span>~</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                min={startDate || new Date().toISOString().split("T")[0]} 
                            />
                        </div>
                        <p className="form-help-text">※ 관리자 승인 시 확정되며, 상황에 따라 기간이 조정될 수 있습니다.</p>
                    </div>

                    <div className="form-submit-area">
                        <button type="submit" className="btn-submit-ad" disabled={isSubmitting}>
                            {isSubmitting ? "신청 중..." : "광고 제휴 신청하기"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="doctor-ad-history">
                <h2>나의 신청 내역</h2>
                {/* ... (이하 기존 내역 렌더링 코드 동일) ... */}
                {loadingAds ? (
                    <div className="history-empty">내역을 불러오는 중입니다...</div>
                ) : myAds.length === 0 ? (
                    <div className="history-empty">아직 신청한 광고 제휴 내역이 없습니다.</div>
                ) : (
                    <div className="history-list">
                        {myAds.map((ad) => (
                            <div key={ad.id} className="history-card">
                                <div className="history-card-header">
                                    <div className="history-title-group">
                                        <strong>{AD_TYPE_LABELS[ad.adType] || ad.adType}</strong>
                                        <span className="history-date">
                                            {formatDate(ad.requestedAt)} 신청
                                        </span>
                                    </div>
                                    <span className={`status-badge ${ad.status.toLowerCase()}`}>
                                        {ad.status === 'PENDING' && '심사 대기'}
                                        {ad.status === 'APPROVED' && '승인 완료'}
                                        {ad.status === 'REJECTED' && '반려됨'}
                                    </span>
                                </div>
                                
                                <div className="history-card-body">
                                    <p className="approved-text">
                                        <strong>노출 기간:</strong> {ad.startDate} ~ {ad.endDate}
                                    </p>
                                    
                                    {ad.status === 'REJECTED' && (
                                        <div className="rejected-feedback">
                                            <strong>반려 사유:</strong> {ad.adminFeedback}
                                        </div>
                                    )}
                                    {ad.status === 'PENDING' && (
                                        <p className="pending-text">관리자가 신청 내용을 검토 중입니다.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}