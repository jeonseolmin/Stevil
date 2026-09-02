import Dashboard from "../Dashboard";
import { useState } from "react";
import "./DesignPreview.css";

const sample = {
    nickname: "민지", currentWeightKg: 78.4, startWeightKg: 84, targetWeightKg: 72,
    lostWeightKg: 5.6, remainingWeightKg: 6.4, progressRate: 46.7,
    recentWeights: [81.2, 80.8, 81, 80.1, 79.6, 79.2, 78.4].map((weightKg, i) => ({
        weightKg, recordedAt: `2026-08-${String(19 + i * 2).padStart(2, "0")}T09:00:00`,
    })),
};

export default function DesignPreview() {
    const [compact, setCompact] = useState(false);
    return <div className={compact ? "design-preview design-preview--compact" : "design-preview"}>
        <div className="design-preview-bar"><span><b>LOCAL PREVIEW</b> 가상 데이터로 보는 디자인 시안</span><button onClick={() => setCompact(!compact)}>{compact ? "넓게 보기" : "좁게 보기"}</button></div>
        <header className="design-preview-nav"><a href="/__design" className="design-preview-logo">stevil<span>●</span></a><nav aria-label="디자인 예시 메뉴"><strong>대시보드</strong><span>건강 기록</span><span>커뮤니티</span></nav><span className="design-preview-user">M</span></header>
        <Dashboard previewData={sample} />
    </div>;
}
