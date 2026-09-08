import { formatWeight } from "./dashboardUtils";

export default function DashboardWeightSummary({ dashboard, progressRate, onRecord }) {
    return (
        <section className="dashboard-weight-summary" aria-labelledby="weight-summary-title">
            <div className="dashboard-section-heading">
                <div><span>체중 관리</span><h2 id="weight-summary-title">목표를 향한 진행 상황</h2></div>
                <button type="button" className="dashboard-text-button" onClick={onRecord}>체중 기록하기</button>
            </div>
            <div className="weight-card-grid">
                <article className="weight-card weight-card--primary">
                    <span>현재 체중</span><strong>{formatWeight(dashboard.currentWeightKg)}<small>kg</small></strong>
                    <p>시작 체중 {formatWeight(dashboard.startWeightKg)}kg</p>
                </article>
                <article className="weight-card">
                    <span>감량한 체중</span><strong>{formatWeight(dashboard.lostWeightKg)}<small>kg</small></strong>
                    <p>지금까지의 변화입니다.</p>
                </article>
                <article className="weight-card">
                    <span>목표까지</span><strong>{formatWeight(dashboard.remainingWeightKg)}<small>kg</small></strong>
                    <p>목표 체중 {formatWeight(dashboard.targetWeightKg)}kg</p>
                </article>
            </div>
            <div className="dashboard-progress-card">
                <div className="dashboard-progress-info"><span>전체 감량 진행률</span><strong>{progressRate.toFixed(1)}%</strong></div>
                <div className="dashboard-progress-track" role="progressbar" aria-label="체중 감량 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressRate}>
                    <span style={{ width: `${progressRate}%` }} />
                </div>
            </div>
        </section>
    );
}

