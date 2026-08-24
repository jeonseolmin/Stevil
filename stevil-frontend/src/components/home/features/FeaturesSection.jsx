import { Link } from "react-router-dom";

import "./FeaturesSection.css";

const FEATURES = [
    {
        key: "dashboard",
        icon: "D",
        label: "한눈에 확인",
        title: "건강 대시보드",
        description:
            "오늘의 체중, 식단, 운동과 투약 기록을 한 화면에서 확인할 수 있습니다.",
        tags: [
            "오늘의 기록",
            "목표 진행률",
            "최근 변화",
        ],
        path: "/dashboard",
    },
    {
        key: "weight",
        icon: "W",
        label: "변화 기록",
        title: "체중 관리",
        description:
            "매일의 체중을 기록하고 단기적인 증감보다 장기적인 변화 흐름을 확인합니다.",
        tags: [
            "체중 기록",
            "목표 체중",
            "변화 그래프",
        ],
        path: "/weight",
    },
    {
        key: "diet",
        icon: "F",
        label: "식사 관리",
        title: "식단 기록",
        description:
            "하루 동안 먹은 음식과 식사 내용을 기록하여 식습관을 관리합니다.",
        tags: [
            "식사 기록",
            "영양 정보",
            "섭취 관리",
        ],
        path: "/diet",
    },
    {
        key: "exercise",
        icon: "E",
        label: "활동 관리",
        title: "운동 기록",
        description:
            "운동 종류와 시간, 활동 내용을 기록하고 꾸준한 운동 습관을 관리합니다.",
        tags: [
            "운동 종류",
            "운동 시간",
            "활동 기록",
        ],
        path: "/exercise",
    },
    {
        key: "injection",
        icon: "I",
        label: "치료 기록",
        title: "투약·증상 일지",
        description:
            "처방받은 투약 내용과 몸 상태를 기록하여 진료 시 참고할 수 있습니다.",
        tags: [
            "투약 기록",
            "증상 기록",
            "일정 확인",
        ],
        path: "/diary",
    },
    {
        key: "hospital",
        icon: "H",
        label: "주변 시설",
        title: "병원·약국 찾기",
        description:
            "현재 위치나 검색 지역을 기준으로 주변 병원과 약국 정보를 확인합니다.",
        tags: [
            "위치 검색",
            "병원 정보",
            "약국 정보",
        ],
        path: "/hospitals",
    },
];

export default function FeaturesSection() {
    return (
        <section
            id="features"
            className="features-section"
        >
            <div className="features-inner">
                <header className="features-heading">
                    <div>
                        <span>STEVIL FEATURES</span>

                        <h2>
                            건강관리의 모든 기록을
                            <br />
                            한곳에서 관리하세요
                        </h2>
                    </div>

                    <p>
                        체중과 생활 습관부터 투약과 증상까지
                        필요한 건강 정보를 간편하게 기록하고
                        확인할 수 있습니다.
                    </p>
                </header>

                <div className="features-grid">
                    {FEATURES.map((feature) => (
                        <article
                            key={feature.key}
                            className={`feature-card feature-card--${feature.key}`}
                        >
                            <div className="feature-card-top">
                                <span
                                    className="feature-card-icon"
                                    aria-hidden="true"
                                >
                                    {feature.icon}
                                </span>

                                <span className="feature-card-label">
                                    {feature.label}
                                </span>
                            </div>

                            <h3>{feature.title}</h3>

                            <p>{feature.description}</p>

                            <ul>
                                {feature.tags.map((tag) => (
                                    <li key={tag}>
                                        {tag}
                                    </li>
                                ))}
                            </ul>

                            <Link
                                to={feature.path}
                                className="feature-card-link"
                            >
                                기능 살펴보기
                                <span aria-hidden="true">›</span>
                            </Link>
                        </article>
                    ))}
                </div>

                <aside className="features-notice">
                    <div>
                        <span aria-hidden="true">i</span>

                        <p>
                            Stevil의 기록과 건강 정보는 의료진의
                            진단이나 처방을 대신하지 않습니다.
                        </p>
                    </div>

                    <a href="/#safety">
                        안심 안내 확인
                    </a>
                </aside>
            </div>
        </section>
    );
}