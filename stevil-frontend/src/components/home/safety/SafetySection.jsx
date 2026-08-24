
import "./SafetySection.css";

const SAFETY_ITEMS = [
    {
        key: "medical",
        icon: "M",
        title: "의료진의 진료를 대신하지 않습니다",
        description:
            "Stevil에서 제공하는 건강 정보와 기록 분석은 참고용이며 의료진의 진단이나 처방을 대신하지 않습니다.",
    },
    {
        key: "prescription",
        icon: "P",
        title: "처방받은 내용만 기록합니다",
        description:
            "약물 종류와 투여 용량은 반드시 의료진에게 안내받거나 처방전에 기재된 내용을 기준으로 입력해 주세요.",
    },
    {
        key: "privacy",
        icon: "S",
        title: "개인 건강정보를 보호합니다",
        description:
            "로그인한 사용자의 건강 기록만 조회하고 수정할 수 있도록 인증과 접근 권한을 구분합니다.",
    },
];

const WARNING_SIGNS = [
    "지속되거나 심해지는 복통",
    "반복되는 구토와 탈수 증상",
    "호흡곤란 또는 심한 알레르기 증상",
    "의식 변화 또는 일상생활이 어려운 증상",
];

export default function SafetySection() {
    return (
        <section
            id="safety"
            className="safety-section"
        >
            <div className="safety-inner">
                <header className="safety-heading">
                    <span>SAFETY GUIDE</span>

                    <h2>
                        안전한 건강 관리를 우선합니다
                    </h2>

                    <p>
                        Stevil은 건강 기록을 편리하게 관리할
                        수 있도록 돕지만 의료진의 판단을
                        대신하지 않습니다.
                    </p>
                </header>

                <div className="safety-card-grid">
                    {SAFETY_ITEMS.map((item) => (
                        <article
                            key={item.key}
                            className="safety-card"
                        >
                            <span
                                className={`safety-card-icon safety-card-icon--${item.key}`}
                                aria-hidden="true"
                            >
                                {item.icon}
                            </span>

                            <h3>{item.title}</h3>

                            <p>{item.description}</p>
                        </article>
                    ))}
                </div>

                <aside className="safety-warning">
                    <div className="safety-warning-heading">
                        <span
                            className="safety-warning-icon"
                            aria-hidden="true"
                        >
                            !
                        </span>

                        <div>
                            <span>MEDICAL NOTICE</span>

                            <h3>
                                이런 증상이 있다면 의료기관에
                                문의하세요
                            </h3>
                        </div>
                    </div>

                    <ul>
                        {WARNING_SIGNS.map((warning) => (
                            <li key={warning}>
                                <span aria-hidden="true">
                                    •
                                </span>

                                {warning}
                            </li>
                        ))}
                    </ul>

                    <p>
                        위 증상 외에도 평소와 다른 심각한
                        증상이 나타난 경우 서비스의 정보에
                        의존하지 말고 의료기관이나 응급실에
                        문의해 주세요.
                    </p>
                </aside>

                <div className="safety-source-notice">
                    <div>
                        <strong>건강 콘텐츠 운영 원칙</strong>

                        <p>
                            공신력 있는 의료기관, 의약품 허가
                            정보와 검토된 연구자료를 기준으로
                            건강 콘텐츠를 제공합니다.
                        </p>
                    </div>

                    <a href="/#features">
                        주요 기능 다시 보기
                    </a>
                </div>
            </div>
        </section>
    );
}