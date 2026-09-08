export default function DashboardPopupAd({ ad, open, onClose, onCloseToday }) {
    if (!open || !ad) return null;
    return <div className="dashboard-popup-overlay"><div className="dashboard-popup-content"><span className="popup-badge">스폰서</span><h3>건강한 변화의 시작</h3><p><strong>{ad.doctorName}</strong>에서<br />맞춤형 상담을 받아보세요.</p><div className="popup-actions"><button type="button" className="btn-close-today" onClick={onCloseToday}>오늘 하루 보지 않기</button><button type="button" className="btn-close" onClick={onClose}>닫기</button></div></div></div>;
}
