
import { Link } from "react-router-dom";

import "./PartnershipSection.css";

const BENEFITS = [
    {
        number: "01",
        title: "위치 기반 시설 노출",
        description:
            "사용자 위치와 검색 조건을 기반으로 병원과 약국 정보를 제공합니다.",
    },
    {
        number: "02",
        title: "정확한 시설 정보 관리",
        description:
            "주소, 연락처와 운영 정보를 관리자 승인 후 안전하게 관리합니다.",
    },
    {
        number: "03",
        title: "GLP-1 사용자 연결",
        description:
            "진료와 처방 정보를 찾는 사용자에게 필요한 의료기관 정보를 전달합니다.",
    },
];

const PROCESS_STEPS = [
    "제휴 문의",
    "시설 정보 확인",
    "관리자 검토",
    "시설 정보 공개",
];

export default function PartnershipSection() {
    return (
        <section
            id="partnership"
            className="partnership-section"
        >
            <div className="partnership-inner">
                <div className="partnership-intro">
                    <div className="partnership-heading">
                        <span>STEVIL PARTNERSHIP</span>

                        <h2>
                            병원·약국과 함께 만드는
                            <br />
                            안전한 건강관리 환경
                        </h2>

                        <p>
                            Stevil은 정확한 의료기관 정보를
                            제공하고 사용자가 적절한 진료와
                            상담을 받을 수 있도록 병원·약국
                            제휴를 준비하고 있습니다.
                        </p>
                    </div>

                    <div className="partnership-actions">
                        <a
                            href="mailto:제휴문의이메일을입력하세요"
                            className="partnership-primary-button"
                        >
                            제휴 문의하기
                        </a>

                        <Link
                            to="/hospitals"
                            className="partnership-secondary-button"
                        >
                            병원·약국 찾아보기
                        </Link>
                    </div>

                    <p className="partnership-action-notice">
                        제휴 시설은 운영자 확인과 승인 절차를
                        거쳐 서비스에 표시됩니다.
                    </p>
                </div>

                <div className="partnership-visual">
                    <div className="partnership-visual-mark">
                        <span>S</span>
                    </div>

                    <strong>Stevil Partner</strong>

                    <p>
                        신뢰할 수 있는 의료기관 정보를
                        사용자에게 전달합니다.
                    </p>

                    <div className="partnership-visual-tags">
                        <span>병원</span>
                        <span>약국</span>
                        <span>위치 정보</span>
                    </div>
                </div>

                <div className="partnership-benefit-grid">
                    {BENEFITS.map((benefit) => (
                        <article key={benefit.number}>
                            <span>{benefit.number}</span>

                            <h3>{benefit.title}</h3>

                            <p>{benefit.description}</p>
                        </article>
                    ))}
                </div>

                <div className="partnership-process">
                    <header>
                        <span>PARTNERSHIP PROCESS</span>
                        <h3>제휴 등록 절차</h3>
                    </header>

                    <ol>
                        {PROCESS_STEPS.map((step, index) => (
                            <li key={step}>
                                <span>{index + 1}</span>

                                <div>
                                    <small>
                                        STEP {index + 1}
                                    </small>

                                    <strong>{step}</strong>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                <aside className="partnership-medical-notice">
                    <strong>제휴 운영 안내</strong>

                    <p>
                        Stevil은 특정 의약품의 처방이나 구매를
                        유도하지 않습니다. 제휴 여부와 관계없이
                        의료행위와 처방은 의료진의 독립적인
                        판단에 따라 이루어져야 합니다.
                    </p>
                </aside>
            </div>
        </section>
    );
}