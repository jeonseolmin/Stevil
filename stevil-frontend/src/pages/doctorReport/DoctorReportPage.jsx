import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance.js"; // 경로 주의!
import "./DoctorReportPage.css";

export default function DoctorReportPage() {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axiosInstance.get("/patient-reports/doctor");
                setReports(response.data);
                // 리포트가 하나라도 있으면 첫 번째 리포트를 기본 선택 상태로 둠
                if (response.data.length > 0) {
                    setSelectedReport(response.data[0]);
                }
            } catch (error) {
                console.error("리포트 불러오기 실패:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const handleSelectReport = (report) => {
        setSelectedReport(report);
        // TODO: 백엔드에 '읽음 처리(READ)' API 연결 가능
    };

    return (
        <section className="doctor-report-page">
            <header className="report-header">
                <div>
                    <span>AI REPORT INBOX</span>
                    <h1>환자 투약/건강 리포트 수신함</h1>
                    <p>Stevil AI가 요약한 환자들의 주사일지 및 건강 상태를 확인하세요.</p>
                </div>
            </header>

            <div className="report-container">
                {/* 왼쪽: 환자 리포트 리스트 */}
                <aside className="report-list-sidebar">
                    <div className="list-header">
                        <h3>받은 리포트 ({reports.length})</h3>
                    </div>
                    {loading ? (
                        <p style={{ padding: "20px", textAlign: "center", color: "#8b9b98" }}>불러오는 중...</p>
                    ) : (
                        <ul className="report-list">
                            {reports.length === 0 ? (
                                <p style={{ padding: "20px", textAlign: "center", color: "#8b9b98" }}>도착한 리포트가 없습니다.</p>
                            ) : (
                                reports.map(report => (
                                    <li 
                                        key={report.id} 
                                        className={`report-item ${selectedReport?.id === report.id ? 'active' : ''} ${report.status === 'UNREAD' ? 'unread' : ''}`}
                                        onClick={() => handleSelectReport(report)}
                                    >
                                        <div className="report-item-header">
                                            <strong>{report.patientName} 환자</strong>
                                            {report.status === 'UNREAD' && <span className="new-badge">NEW</span>}
                                        </div>
                                        <span className="report-date">{report.sentAt} 전송됨</span>
                                        <p className="report-preview">{report.aiSummary}</p>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </aside>

                {/* 오른쪽: 리포트 상세 내용 (AI 요약) */}
                <main className="report-detail-view">
                    {selectedReport ? (
                        <div className="detail-card">
                            <div className="detail-patient-info">
                                <div>
                                    <h2>{selectedReport.patientName} 환자 리포트</h2>
                                    <span>{selectedReport.patientAge}세 / {selectedReport.patientGender === 'M' ? '남성' : '여성'}</span>
                                </div>
                                <span className="detail-date">전송일: {selectedReport.sentAt}</span>
                            </div>

                            <div className="ai-summary-box">
                                <div className="ai-summary-header">
                                    <h3>Stevil AI 종합 요약</h3>
                                </div>
                                <div className="ai-summary-content">
                                    {selectedReport.aiSummary.split('\n').map((line, index) => (
                                        <p key={index}>{line}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="detail-actions">
                                <button className="btn-reply">환자에게 피드백 보내기</button>
                            </div>
                        </div>
                    ) : (
                        <div className="empty-detail">
                            <p>왼쪽에서 리포트를 선택해주세요.</p>
                        </div>
                    )}
                </main>
            </div>
        </section>
    );
}