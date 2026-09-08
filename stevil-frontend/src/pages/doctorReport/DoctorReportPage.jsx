import { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance.js";
import "./DoctorReportPage.css";

export default function DoctorReportPage() {
    const [reports, setReports] = useState([]);
    const [selectedReport, setSelectedReport] = useState(null);
    const [loading, setLoading] = useState(true);

    const [feedbackText, setFeedbackText] = useState("");
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await axiosInstance.get("/doctor/reports");
                setReports(response.data);
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
        setFeedbackText("");
    };

    const handleSendFeedback = async () => {
        if (!feedbackText.trim()) {
            alert("피드백 내용을 입력해주세요.");
            return;
        }
        if (!selectedReport) return;

        setIsSendingFeedback(true);
        try {
            await axiosInstance.post("/doctor/feedback", {
                reportId: selectedReport.id,
                content: feedbackText
            });
            alert("환자에게 피드백이 성공적으로 전송되었습니다!");
            setFeedbackText("");
        } catch (error) {
            console.error("피드백 전송 실패:", error);
            alert("전송에 실패했습니다.");
        } finally {
            setIsSendingFeedback(false);
        }
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

                {/* 오른쪽: 리포트 상세 내용 및 피드백 작성 */}
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

                            <div className="feedback-section" style={{ marginTop: '24px', borderTop: '1px solid #e2e8e8', paddingTop: '20px' }}>
                                <h3>주치의 피드백 작성</h3>
                                <textarea
                                    value={feedbackText}
                                    onChange={(e) => setFeedbackText(e.target.value)}
                                    placeholder="환자에게 전달할 투약 조언이나 진료 코멘트를 작성해주세요."
                                    style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '8px', resize: 'vertical' }}
                                />
                                <div className="detail-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        className="btn-reply" 
                                        onClick={handleSendFeedback}
                                        disabled={isSendingFeedback}
                                    >
                                        {isSendingFeedback ? '전송 중...' : '환자에게 피드백 전송하기'}
                                    </button>
                                </div>
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