import { Link } from "react-router-dom";
import "./FeaturesSection.css";

const features = [
    {
        id: "hospital-map",
        number: "01",
        category: "병원·약국",
        title: "내 주변 의료기관 찾기",
        description:
            "지도에서 가까운 병원과 약국을 찾고 위치, 운영시간, 진료 정보를 한눈에 확인할 수 있습니다.",
        items: ["지도 기반 위치 확인", "운영시간 및 진료 정보", "병원·약국 상세정보"],
        status: "서비스 준비 중",
        statusType: "preparing",
        icon: "⌖",
        className: "feature-card--hospital",
    },
    {
        id: "reservation",
        number: "02",
        category: "상담·예약",
        title: "제휴 병원 상담 연결",
        description:
            "병원별 진료 정보와 상담 방법을 확인하고 제휴 병원의 예약 서비스로 간편하게 연결합니다.",
        items: ["제휴 병원 정보", "상담 및 예약 연결", "제휴 병원 인증 표시"],
        status: "제휴 서비스 예정",
        statusType: "partnership",
        icon: "+",
        className: "feature-card--reservation",
    },
    {
        id: "diet",
        number: "03",
        category: "식단 관리",
        title: "부담 없는 식단 기록",
        description:
            "매일 먹은 음식과 영양 정보를 기록하고 치료 과정에 필요한 섭취 상태를 편리하게 확인합니다.",
        items: ["간편한 식사 기록", "영양성분 확인", "일별 섭취 현황"],
        status: "개발 예정",
        statusType: "preparing",
        icon: "D",
        className: "feature-card--diet",
    },
    {
        id: "exercise",
        number: "04",
        category: "운동 관리",
        title: "나에게 맞는 활동 관리",
        description:
            "운동 종류와 시간, 강도를 기록하고 체중 변화와 함께 꾸준한 활동 흐름을 확인할 수 있습니다.",
        items: ["운동 종류 및 시간", "운동 강도 기록", "체중 변화와 함께 확인"],
        status: "개발 예정",
        statusType: "preparing",
        icon: "E",
        className: "feature-card--exercise",
    },
    {
        id: "injection",
        number: "05",
        category: "주사 관리",
        title: "GLP-1 투약 일정 관리",
        description:
            "처방받은 GLP-1 계열 주사제의 투약일과 용량을 기록하고 다음 투약 일정을 확인할 수 있습니다.",
        items: [
            "투약 날짜 및 용량 기록",
            "다음 투약 예정일 확인",
            "투약 부위와 이상 증상 기록",
        ],
        status: "개발 예정",
        statusType: "injection",
        icon: "I",
        className: "feature-card--injection",
    },
    {
        id: "products",
        number: "06",
        category: "건강 제품",
        title: "건강 관리 제품 둘러보기",
        description:
            "단백질 식품, 영양 보충 제품과 건강 관리 용품을 살펴보고 신뢰할 수 있는 판매처로 연결합니다.",
        items: ["목적별 제품 탐색", "제품 정보 및 판매처", "광고·제휴 여부 표시"],
        status: "스토어 준비 중",
        statusType: "store",
        icon: "S",
        className: "feature-card--products",
    },
];

function FeatureCard({ feature }) {
    return (
        <article
            id={feature.id}
            className={`feature-card ${feature.className}`}
        >
            <div className="feature-card-top">
        <span className="feature-number" aria-hidden="true">
          {feature.number}
        </span>

                <span
                    className={`feature-status feature-status--${feature.statusType}`}
                >
          {feature.status}
        </span>
            </div>

            <div className="feature-icon" aria-hidden="true">
                {feature.icon}
            </div>

            <span className="feature-category">{feature.category}</span>

            <h3>{feature.title}</h3>

            <p>{feature.description}</p>

            <ul>
                {feature.items.map((item) => (
                    <li key={item}>
                        <span aria-hidden="true">✓</span>
                        {item}
                    </li>
                ))}
            </ul>
        </article>
    );
}

export default function FeaturesSection() {
    return (
        <section
            id="features"
            className="section features-section"
            aria-labelledby="features-title"
        >
            <div className="page-container">
                <div className="section-heading">
                    <span className="section-eyebrow">주요 기능</span>

                    <h2 id="features-title" className="section-title">
                        치료 기록부터 일상 관리까지
                        <br />
                        <strong>하나의 흐름으로 이어집니다</strong>
                    </h2>

                    <p className="section-description">
                        병원과 약국을 찾는 순간부터 식단, 운동, 건강 제품 관리까지
                        <br className="features-desktop-break" />
                        건강한 변화를 위한 과정을 Stevil에서 함께 관리해보세요.
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((feature) => (
                        <FeatureCard key={feature.id} feature={feature} />
                    ))}
                </div>

                <aside
                    className="partnership-banner"
                    aria-labelledby="partnership-title"
                >
                    <div className="partnership-visual" aria-hidden="true">
            <span className="partnership-building">
              <span />
              <span />
              <span />
              <strong>+</strong>
            </span>
                    </div>

                    <div className="partnership-content">
                        <span className="partnership-label">병원·의료기관 제휴</span>

                        <h3 id="partnership-title">
                            환자와 병원의 건강한 연결을 준비합니다
                        </h3>

                        <p>
                            제휴 병원은 진료 분야와 운영 정보를 안내하고 사용자가 상담과
                            예약 방법을 쉽게 확인할 수 있도록 연결할 수 있습니다.
                        </p>

                        <ul>
                            <li>병원 소개와 진료 정보 제공</li>
                            <li>상담·예약 페이지 연결</li>
                            <li>제휴 병원 인증 배지 제공</li>
                        </ul>
                    </div>

                    <div className="partnership-action">
                        <Link
                            to="/partnership"
                            className="secondary-button partnership-button"
                        >
                            제휴 안내 보기
                            <span aria-hidden="true">→</span>
                        </Link>

                        <small>
                            제휴 신청 기능은 추후 제공될 예정입니다.
                        </small>
                    </div>
                </aside>

                <p className="features-notice">
                    표시된 일부 기능은 현재 개발 또는 제휴 준비 단계이며 제공 시점과
                    세부 내용은 변경될 수 있습니다.
                </p>
            </div>
        </section>
    );
}