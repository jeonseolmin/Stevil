const actions = [
    ["W", "체중", "오늘의 체중 기록", "/weight"], ["D", "식단", "섭취한 음식 기록", "/diet"],
    ["E", "운동", "오늘의 활동 기록", "/exercise"], ["S", "증상", "몸 상태와 증상 기록", "/diary"],
];

export default function DashboardQuickActions({ navigate }) {
    return (
        <article className="dashboard-panel">
            <div className="dashboard-section-heading"><div><span>빠른 기록</span><h2>오늘의 건강 기록</h2></div></div>
            <div className="quick-action-list">{actions.map(([icon, title, description, path]) => (
                <button key={path} type="button" onClick={() => navigate(path)}><span className="quick-action-icon">{icon}</span><span><strong>{title}</strong><small>{description}</small></span><b aria-hidden="true">›</b></button>
            ))}</div>
        </article>
    );
}

