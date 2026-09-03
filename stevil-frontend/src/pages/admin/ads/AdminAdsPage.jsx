import { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosInstance.js"; // 경로를 프로젝트에 맞게 수정해주세요
import "./AdminAdsPage.css"; // CSS 파일 연결 활성화

export default function AdminAdsPage() {
    const [pendingAds, setPendingAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    // 대기 중인 광고 목록 불러오기
    const fetchPendingAds = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get("/ads/admin/pending");
            setPendingAds(response.data);
            setErrorMessage("");
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ?? "광고 신청 목록을 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingAds();
    }, []);

    // 승인 처리 (기본 1개월 노출로 설정)
    const handleApprove = async (adId) => {
        if (!window.confirm("이 광고를 승인하시겠습니까? (기본 1개월 노출)")) return;
        
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);

        try {
            await axiosInstance.patch(`/ads/admin/${adId}/approve`, {
                startDate: today.toISOString().split("T")[0],
                endDate: nextMonth.toISOString().split("T")[0],
            });
            alert("광고가 성공적으로 승인되었습니다.");
            fetchPendingAds(); // 목록 새로고침
        } catch (error) {
            alert("승인 처리 중 오류가 발생했습니다.");
            console.error(error);
        }
    };

    // 거절 처리 (사유 입력)
    const handleReject = async (adId) => {
        const reason = window.prompt("반려 사유를 입력해주세요 (예: 배너 이미지 해상도 낮음):");
        if (!reason) return; // 취소 누르거나 빈칸이면 중단

        try {
            await axiosInstance.patch(`/ads/admin/${adId}/reject`, {
                adminFeedback: reason,
            });
            alert("광고 신청이 반려되었습니다.");
            fetchPendingAds(); // 목록 새로고침
        } catch (error) {
            alert("반려 처리 중 오류가 발생했습니다.");
            console.error(error);
        }
    };

    return (
        <section className="admin-dashboard-page">
            <header className="admin-dashboard-heading">
                <div>
                    <span>ADVERTISEMENT MANAGEMENT</span>
                    <h1>광고·제휴 관리</h1>
                    <p>병원 상단 노출 및 제휴 신청을 검토하고 승인/반려합니다.</p>
                </div>
            </header>

            {errorMessage && (
                <div className="admin-dashboard-error">
                    {errorMessage}
                </div>
            )}

            <div className="admin-ads-card">
                {loading ? (
                    <p>로딩 중...</p>
                ) : (
                    <table className="admin-ads-table">
                        <thead>
                            <tr>
                                <th>신청 번호</th>
                                <th>의사(병원)명</th>
                                <th>광고 타입</th>
                                <th>상태</th>
                                <th style={{ textAlign: "center" }}>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingAds.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="empty-table-row">
                                        대기 중인 광고 신청이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                pendingAds.map((ad) => (
                                    <tr key={ad.id}>
                                        <td>{ad.id}</td>
                                        <td style={{ fontWeight: "bold" }}>{ad.doctorName}</td>
                                        <td className="ad-type-label">{ad.adType}</td>
                                        <td className="ad-status-pending">{ad.status}</td>
                                        <td>
                                            <div className="ad-action-buttons">
                                                <button 
                                                    className="btn-approve" 
                                                    onClick={() => handleApprove(ad.id)}
                                                >
                                                    승인
                                                </button>
                                                <button 
                                                    className="btn-reject" 
                                                    onClick={() => handleReject(ad.id)}
                                                >
                                                    반려
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </section>
    );
}