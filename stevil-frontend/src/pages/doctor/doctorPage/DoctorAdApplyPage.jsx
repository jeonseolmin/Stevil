import { useState } from "react";
import axiosInstance from "../../../api/axiosInstance.js";
import "./DoctorAdApplyPage.css";

export default function DoctorAdApplyPage() {
    const [adType, setAdType] = useState("TOP_BANNER");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!window.confirm("해당 광고 제휴를 신청하시겠습니까? 관리자 승인 후 노출이 시작됩니다.")) return;

        setIsSubmitting(true);
        try {
            await axiosInstance.post("/ads/request", {
                adType: adType,
            });
            alert("광고 제휴 신청이 완료되었습니다. 관리자 검토 후 상태가 업데이트됩니다.");
            // 선택 사항: 신청 후 대시보드 메인으로 이동
            // navigate('/doctor/dashboard');
        } catch (error) {
            alert(error.response?.data?.message ?? "광고 신청 처리 중 오류가 발생했습니다.");
            console.error("광고 신청 에러:", error);
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
                    <p>Stevil 플랫폼 상단 노출 및 프리미엄 제휴를 통해 더 많은 환자와 연결되세요.</p>
                </div>
            </header>

            <div className="doctor-ad-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>광고 상품 선택</label>
                        <div className="ad-options">
                            {/* 라디오 버튼 1: 상단 배너 */}
                            <label className={`ad-option-card ${adType === "TOP_BANNER" ? "selected" : ""}`}>
                                <input
                                    type="radio"
                                    name="adType"
                                    value="TOP_BANNER"
                                    checked={adType === "TOP_BANNER"}
                                    onChange={(e) => setAdType(e.target.value)}
                                />
                                <div>
                                    <strong>메인 대시보드 상단 배너</strong>
                                    <p>환자들의 메인 화면 최상단 롤링 배너에 병원 이미지가 단독 노출됩니다.</p>
                                </div>
                            </label>

                            {/* 라디오 버튼 2: 리스트 강조 */}
                            <label className={`ad-option-card ${adType === "HIGHLIGHT" ? "selected" : ""}`}>
                                <input
                                    type="radio"
                                    name="adType"
                                    value="HIGHLIGHT"
                                    checked={adType === "HIGHLIGHT"}
                                    onChange={(e) => setAdType(e.target.value)}
                                />
                                <div>
                                    <strong>병원 리스트 시각적 강조</strong>
                                    <p>병원 검색 리스트에서 금색 테두리와 하이라이트 효과가 적용됩니다.</p>
                                </div>
                            </label>

                            {/* 라디오 버튼 3: 검색 최상단 고정 */}
                            <label className={`ad-option-card ${adType === "SEARCH_TOP" ? "selected" : ""}`}>
                                <input
                                    type="radio"
                                    name="adType"
                                    value="SEARCH_TOP"
                                    checked={adType === "SEARCH_TOP"}
                                    onChange={(e) => setAdType(e.target.value)}
                                />
                                <div>
                                    <strong>지역 검색 최상단 고정</strong>
                                    <p>환자가 해당 지역 병원을 검색할 때 무조건 1순위로 고정 노출됩니다.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form-submit-area">
                        <button type="submit" className="btn-submit-ad" disabled={isSubmitting}>
                            {isSubmitting ? "신청 중..." : "광고 제휴 신청하기"}
                        </button>
                        <p className="notice-text">
                            * 신청 후 관리자의 승인이 완료되면 입력하신 기간 동안 노출이 시작됩니다.
                        </p>
                    </div>
                </form>
            </div>
        </section>
    );
}