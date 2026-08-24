import "./HowItWorksSection.css";

const STEPS = [
    {
        number: "01",
        title: "간편 로그인",
        description:
            "Google, Naver, Kakao 계정으로 간편하게 로그인합니다.",
    },
    {
        number: "02",
        title: "건강 정보 입력",
        description:
            "현재 체중과 목표 체중, 병원 방문 및 처방 정보를 입력합니다.",
    },
    {
        number: "03",
        title: "매일 건강 기록",
        description:
            "체중, 식단, 운동과 투약 정보를 간편하게 기록합니다.",
    },
    {
        number: "04",
        title: "변화 확인",
        description:
            "대시보드에서 목표 진행률과 최근 건강 기록의 변화를 확인합니다.",
    },
];

export default function HowItWorksSection() {
    return (
        <section
            id="how-it-works"
            className="how-it-works-section"
        >
            <div className="how-it-works-inner">
                <header className="how-it-works-heading">
                    <span>HOW IT WORKS</span>

                    <h2>
                        Stevil은 이렇게 이용합니다
                    </h2>

                    <p>
                        간단한 정보 입력부터 매일의 건강
                        기록까지 단계별로 관리할 수 있습니다.
                    </p>
                </header>

                <div className="how-it-works-grid">
                    {STEPS.map((step, index) => (
                        <article
                            key={step.number}
                            className="how-it-works-card"
                        >
                            <div className="how-it-works-card-top">
                                <span className="how-it-works-number">
                                    {step.number}
                                </span>

                                {index < STEPS.length - 1 && (
                                    <span
                                        className="how-it-works-arrow"
                                        aria-hidden="true"
                                    >
                                        →
                                    </span>
                                )}
                            </div>

                            <h3>{step.title}</h3>

                            <p>{step.description}</p>
                        </article>
                    ))}
                </div>

                <div className="how-it-works-summary">
                    <div>
                        <span aria-hidden="true">✓</span>

                        <p>
                            처음 입력한 정보는 이후 설정에서
                            변경할 수 있습니다.
                        </p>
                    </div>

                    <div>
                        <span aria-hidden="true">✓</span>

                        <p>
                            매일 모든 항목을 기록하지 않아도
                            필요한 정보만 선택해 기록할 수
                            있습니다.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}