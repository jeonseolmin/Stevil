export default function DashboardTopBanner({ ads }) {
    if (!ads.length) return null;
    return <section className="dashboard-premium-banner">{ads.map((ad) => <div key={ad.id} className="premium-banner-content"><span className="banner-badge">광고</span><p><strong>{ad.doctorName}</strong>에서 전문적인 맞춤형 건강 관리를 시작하세요!</p></div>)}</section>;
}

