import { exerciseSourceUrl } from "./plannerEventUtils";

const CATEGORIES = { aerobic: "유산소", resistance: "근력", mobility: "유연성·가동성", balance: "균형", mixed: "복합" };
const DIFFICULTIES = { beginner: "초보", intermediate: "중급", advanced: "고급" };
const IMPACTS = { low: "낮음", moderate: "보통", high: "높음" };
const GRADES = { A: "강한 권고", B: "중등도 권고", C: "약한 권고", D: "반대 권고", E: "전문가 의견", N: "찬반 권고 없음" };

export default function ExerciseDetails({ event }) {
    const evidence = event.exerciseEvidence || [];
    return <div className="planner-workout-summary">
        <span>{event.intensity}</span>
        <p>{event.details}</p>
        {!!event.exerciseId && <div className="planner-detail-meta">
            <span>종류 <b>{CATEGORIES[event.exerciseCategory] || event.exerciseCategory || "미제공"}</b></span>
            <span>난이도 <b>{DIFFICULTIES[event.exerciseDifficulty] || event.exerciseDifficulty || "미제공"}</b></span>
            <span>장비 <b>{event.exerciseEquipment || "미제공"}</b></span>
            <span>충격 수준 <b>{IMPACTS[event.exerciseImpact] || event.exerciseImpact || "미제공"}</b></span>
        </div>}
        {evidence.length ? <details className="planner-detail-disclosure">
            <summary>운동 근거와 출처 · {evidence.length}건</summary>
            <p className="planner-help">추천에 참고한 자료입니다. 적용 대상과 검토 상태를 함께 확인하세요.</p>
            {evidence.map(item => {
                const url = exerciseSourceUrl(item.url);
                return <article className="planner-exercise-evidence" key={item.evidenceId}>
                    <strong>{item.title || item.section}</strong>
                    {item.section && item.section !== item.title && <p>{item.section}</p>}
                    <p>적용 대상: {item.population || "미제공"}</p>
                    {item.recommendationGrade && <p>원문 권고 등급: {item.recommendationGrade} · {GRADES[item.recommendationGrade] || item.recommendationStrength || "원문 확인"}</p>}
                    <p>검토 상태: {item.reviewStatus === "approved" ? "승인됨" : "검토 대기"}</p>
                    {!item.glp1Specific && <p className="planner-help">GLP-1 약물 사용자 전용 근거는 아닙니다.</p>}
                    <details><summary>근거 원문 구간</summary><p className="planner-evidence-text">{item.text}</p></details>
                    {url && <a href={url} target="_blank" rel="noreferrer">출처 원문 보기 ↗</a>}
                </article>;
            })}
        </details> : <p className="planner-detail-caption">연결된 운동 근거가 없습니다. 새 계획을 생성하면 확인할 수 있어요.</p>}
    </div>;
}
