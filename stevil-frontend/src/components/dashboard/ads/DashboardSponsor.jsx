export default function DashboardSponsor({ ads }) {
    if (!ads.length) return null;
    return <section className="dashboard-sponsor-section">{ads.map((ad) => <div key={ad.id} className="sponsor-text-banner"><span>오늘의 건강 기록을 응원합니다!</span><p>이 대시보드는 <strong>{ad.doctorName}</strong>의 후원으로 제공됩니다.</p></div>)}</section>;
}

