const cards = [["식단", "오늘 먹은 음식과 영양 정보를 기록해 보세요.", "식단 기록", "/diet"], ["운동", "운동 종류와 시간을 기록해 보세요.", "운동 기록", "/exercise"], ["증상", "불편했던 증상이나 몸 상태를 남겨 보세요.", "증상 기록", "/diary"]];

export default function DashboardDailyCards({ navigate }) {
    return (
        <section className="dashboard-daily-section">
            <div className="dashboard-section-heading"><div><span>오늘의 기록</span><h2>아직 기록하지 않은 항목</h2></div></div>
            <div className="daily-card-grid">{cards.map(([title, description, label, path]) => (
                <article className="daily-card" key={path}><span className="daily-card-status">기록 전</span><h3>{title}</h3><p>{description}</p><button type="button" onClick={() => navigate(path)}>{label}</button></article>
            ))}</div>
        </section>
    );
}

