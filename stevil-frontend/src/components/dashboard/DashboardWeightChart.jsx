import { useMemo } from "react";
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from "chart.js";
import { Line } from "react-chartjs-2";
import { formatDate } from "./dashboardUtils";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function DashboardWeightChart({ recentWeights = [], onRecord }) {
    const data = useMemo(() => ({
        labels: recentWeights.map((record) => formatDate(record.recordedAt)),
        datasets: [{ label: "체중", data: recentWeights.map((record) => Number(record.weightKg)), borderColor: "#20bfa9", backgroundColor: "rgba(32, 191, 169, 0.12)", pointBackgroundColor: "#ffffff", pointBorderColor: "#20bfa9", pointBorderWidth: 3, pointRadius: 5, pointHoverRadius: 7, borderWidth: 3, tension: 0.35, fill: true }],
    }), [recentWeights]);
    const options = useMemo(() => ({
        responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { display: false },
            tooltip: {
                displayColors: false,
                padding: { top: 6, right: 12, bottom: 6, left: 12 },
                caretPadding: 6,
                cornerRadius: 8,
                titleAlign: "center",
                bodyAlign: "center",
                titleFont: { size: 11, weight: "500", lineHeight: 1.3 },
                bodyFont: { size: 14, weight: "700", lineHeight: 1.3 },
                titleColor: "rgba(255, 255, 255, 0.78)",
                bodyColor: "#ffffff",
                titleMarginBottom: 3,
                callbacks: { label: (context) => `${Number(context.raw).toFixed(1)}kg` },
            },
        },
        scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: "#7d918e" } }, y: { grace: "10%", border: { display: false }, grid: { color: "rgba(220, 233, 230, 0.7)" }, ticks: { color: "#7d918e", callback: (value) => `${value}kg` } } },
    }), []);

    return (
        <article className="dashboard-panel dashboard-chart-panel">
            <div className="dashboard-section-heading"><div><span>최근 기록</span><h2>체중 변화</h2></div></div>
            {recentWeights.length >= 2 ? <div className="dashboard-chart"><Line data={data} options={options} /></div> : (
                <div className="dashboard-empty-chart"><strong>체중 기록을 시작해 보세요</strong><p>체중을 두 번 이상 기록하면 변화 그래프가 표시됩니다.</p><button type="button" onClick={onRecord}>체중 기록하기</button></div>
            )}
        </article>
    );
}

