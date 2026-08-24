import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    Link,
    useLocation,
} from "react-router-dom";

import PartnershipInquiryModal from
        "../../components/home/partnership/modal/PartnershipInquiryModal.jsx";

import "./PartnershipGuidePage.css";

const PARTNERSHIP_TARGETS = [
    {
        number: "01",
        title: "병원",
        description:
            "GLP-1 비만 치료 상담과 진료 정보를 제공하는 의료기관",
        items: [
            "병원명과 사업자 정보",
            "주소 및 연락처",
            "진료 시간",
            "진료과목 및 안내 정보",
        ],
    },
    {
        number: "02",
        title: "약국",
        description:
            "사용자에게 정확한 위치와 운영 정보를 제공하려는 약국",
        items: [
            "약국명과 사업자 정보",
            "주소 및 연락처",
            "운영 시간",
            "시설 이용 안내",
        ],
    },
];

const PROCESS_STEPS = [
    {
        number: "01",
        title: "제휴 문의",
        description:
            "제휴를 원하는 병원 또는 약국의 기본 정보를 전달합니다.",
    },
    {
        number: "02",
        title: "시설 정보 확인",
        description:
            "제출한 시설명, 주소, 연락처와 운영 정보를 확인합니다.",
    },
    {
        number: "03",
        title: "관리자 검토",
        description:
            "Stevil 관리자가 시설 정보와 제휴 등록 가능 여부를 검토합니다.",
    },
    {
        number: "04",
        title: "시설 정보 공개",
        description:
            "승인된 시설은 병원·약국 찾기 화면에 표시됩니다.",
    },
];

const REQUIRED_INFORMATION = [
    "병원 또는 약국 이름",
    "시설 유형",
    "사업자 또는 의료기관 정보",
    "대표자 또는 담당자 이름",
    "시설 주소",
    "대표 연락처",
    "운영 및 진료 시간",
    "제휴 담당자 이메일",
];

export default function PartnershipGuidePage() {
    const location = useLocation();

    const [
        inquiryModalOpen,
        setInquiryModalOpen,
    ] = useState(false);

    useEffect(() => {
        if (!location.hash) {
            window.scrollTo({
                top: 0,
                behavior: "instant",
            });

            return;
        }

        const sectionId =
            location.hash.replace("#", "");

        const animationFrame =
            window.requestAnimationFrame(() => {
                const section =
                    document.getElementById(
                        sectionId
                    );

                section?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            });

        return () => {
            window.cancelAnimationFrame(
                animationFrame
            );
        };
    }, [location.pathname, location.hash]);

    const handleOpenInquiryModal = () => {
        setInquiryModalOpen(true);
    };

    const handleCloseInquiryModal =
        useCallback(() => {
            setInquiryModalOpen(false);
        }, []);
    return (
        <>
            <main className="partnership-guide-page">
                <section
                    id="partnership-intro"
                    className="partnership-guide-hero"
                >
                    <div className="partnership-guide-container">
                        <div className="partnership-guide-breadcrumb">
                            <Link to="/">홈</Link>
                            <span aria-hidden="true">/</span>
                            <strong>제휴 안내</strong>
                        </div>

                        <div className="partnership-guide-hero-content">
                            <div className="partnership-guide-hero-text">
                            <span className="partnership-guide-eyebrow">
                                STEVIL PARTNERSHIP
                            </span>

                                <h1>
                                    신뢰할 수 있는 건강관리 환경을
                                    <br />
                                    함께 만들어갑니다
                                </h1>

                                <p>
                                    Stevil은 사용자에게 정확한 병원·약국
                                    정보를 제공하기 위해 의료기관과의
                                    제휴를 준비하고 있습니다.
                                </p>

                                <div className="partnership-guide-hero-actions">
                                    <button
                                        type="button"
                                        className="partnership-guide-primary-button"
                                        onClick={handleOpenInquiryModal}
                                    >
                                        제휴 문의하기
                                    </button>

                                    <Link
                                        to="/hospitals"
                                        className="partnership-guide-secondary-button"
                                    >
                                        병원·약국 찾아보기
                                    </Link>
                                </div>
                            </div>

                            <aside className="partnership-guide-summary">
                                <div className="partnership-guide-summary-mark">
                                    S
                                </div>

                                <span>STEVIL PARTNER</span>
                                <strong>병원·약국 제휴 안내</strong>

                                <ul>
                                    <li>
                                        <span aria-hidden="true">✓</span>
                                        시설 정보 검토
                                    </li>

                                    <li>
                                        <span aria-hidden="true">✓</span>
                                        관리자 승인
                                    </li>

                                    <li>
                                        <span aria-hidden="true">✓</span>
                                        서비스 내 정보 제공
                                    </li>
                                </ul>
                            </aside>
                        </div>
                    </div>
                </section>

                <section

                    className="partnership-guide-section"
                >
                    <div
                        id="partnership-target"
                        className="partnership-guide-container"
                    >
                        <header className="partnership-guide-heading">
                            <span>PARTNERSHIP TARGET</span>
                            <h2>제휴 대상</h2>
                            <p>
                                정확한 시설 정보를 제공할 수 있는 병원과
                                약국의 제휴 문의를 받고 있습니다.
                            </p>
                        </header>

                        <div className="partnership-target-grid">
                            {PARTNERSHIP_TARGETS.map((target) => (
                                <article
                                    key={target.number}
                                    className="partnership-target-card"
                                >
                                    <div className="partnership-target-card-heading">
                                        <span>{target.number}</span>

                                        <div>
                                            <h3>{target.title}</h3>
                                            <p>{target.description}</p>
                                        </div>
                                    </div>

                                    <ul>
                                        {target.items.map((item) => (
                                            <li key={item}>
                                                <span aria-hidden="true">✓</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    id="partnership-process"
                    className="partnership-guide-section partnership-guide-section--soft"
                >
                    <div className="partnership-guide-container">
                        <header className="partnership-guide-heading">
                            <span>PARTNERSHIP PROCESS</span>
                            <h2>제휴 등록 절차</h2>
                            <p>
                                문의 접수부터 서비스 공개까지 관리자가
                                시설 정보를 확인합니다.
                            </p>
                        </header>

                        <ol className="partnership-guide-process">
                            {PROCESS_STEPS.map((step) => (
                                <li key={step.number}>
                                    <span>{step.number}</span>

                                    <div>
                                        <small>
                                            STEP {Number(step.number)}
                                        </small>

                                        <h3>{step.title}</h3>
                                        <p>{step.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section                     
                    id="partnership-information"
                    className="partnership-guide-section"
                >
                    <div className="partnership-guide-container partnership-information-layout">
                        <div>
                            <header className="partnership-guide-heading partnership-guide-heading--left">
                                <span>REQUIRED INFORMATION</span>
                                <h2>제휴 문의 시 필요한 정보</h2>
                                <p>
                                    아래 내용을 함께 전달해 주시면 보다
                                    원활하게 검토할 수 있습니다.
                                </p>
                            </header>

                            <ul className="partnership-information-list">
                                {REQUIRED_INFORMATION.map(
                                    (information, index) => (
                                        <li key={information}>
                                            <span>{index + 1}</span>
                                            <strong>{information}</strong>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>

                        <aside className="partnership-review-card">
                            <span>REVIEW GUIDE</span>
                            <h3>등록 전 확인해 주세요</h3>

                            <ul>
                                <li>
                                    제출된 정보는 관리자 검토 후
                                    공개됩니다.
                                </li>

                                <li>
                                    확인하기 어려운 정보가 있으면 추가
                                    자료를 요청할 수 있습니다.
                                </li>

                                <li>
                                    잘못되거나 과장된 정보는 등록이
                                    거절될 수 있습니다.
                                </li>

                                <li>
                                    승인 이후에도 시설 정보는 변경되거나
                                    노출이 중단될 수 있습니다.
                                </li>
                            </ul>
                        </aside>
                    </div>
                </section>

                <section
                    id="partnership-notice"
                    className="partnership-guide-notice"
                >
                    <div className="partnership-guide-container">
                        <div className="partnership-guide-notice-card">
                            <div>
                                <span>MEDICAL INFORMATION NOTICE</span>
                                <h2>의료정보 및 제휴 운영 안내</h2>
                            </div>

                            <p>
                                Stevil은 특정 의약품의 처방이나 구매를
                                유도하지 않습니다. 제휴 여부와 관계없이
                                진료와 처방은 의료진의 독립적인 판단에
                                따라 이루어져야 하며, 서비스에 표시되는
                                시설 정보는 의료적 효능이나 치료 결과를
                                보장하지 않습니다.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id ="partnership-contact"
                    className="partnership-guide-cta"
                >
                    <div className="partnership-guide-container">
                        <div>
                            <span>CONTACT US</span>
                            <h2>Stevil과 함께하시겠습니까?</h2>
                            <p>
                                제휴를 원하는 병원·약국의 기본 정보를
                                이메일로 전달해 주세요.
                            </p>
                        </div>

                        <div className="partnership-guide-cta-actions">
                            <button
                                type="button"
                                className="partnership-guide-primary-button"
                                onClick={handleOpenInquiryModal}
                            >
                                제휴 문의하기
                            </button>

                            <Link
                                to="/"
                                className="partnership-guide-secondary-button"
                            >
                                홈으로 돌아가기
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {inquiryModalOpen && (
                <PartnershipInquiryModal
                    onClose={handleCloseInquiryModal}
                />
            )}
        </>
    );
}