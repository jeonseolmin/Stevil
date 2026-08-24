import { useEffect, useState } from "react";

import "./PartnershipInquiryModal.css";

const INITIAL_FORM = {
    facilityType: "",
    facilityName: "",
    managerName: "",
    phone: "",
    email: "",
    address: "",
    message: "",
    privacyAgreed: false,
};

export default function PartnershipInquiryModal({
                                                    onClose,
                                                }) {
    const [form, setForm] = useState(INITIAL_FORM);
    const [errorMessage, setErrorMessage] =
        useState("");
    const [submitted, setSubmitted] =
        useState(false);

    useEffect(() => {
        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [onClose]);

    const handleChange = (event) => {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));

        if (errorMessage) {
            setErrorMessage("");
        }
    };

    const validateForm = () => {
        if (!form.facilityType) {
            return "시설 유형을 선택해 주세요.";
        }

        if (!form.facilityName.trim()) {
            return "병원 또는 약국 이름을 입력해 주세요.";
        }

        if (!form.managerName.trim()) {
            return "담당자 이름을 입력해 주세요.";
        }

        if (!form.phone.trim()) {
            return "연락처를 입력해 주세요.";
        }

        const phonePattern =
            /^[0-9+\-\s()]{8,20}$/;

        if (!phonePattern.test(form.phone.trim())) {
            return "연락처 형식을 확인해 주세요.";
        }

        if (!form.email.trim()) {
            return "이메일을 입력해 주세요.";
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(form.email.trim())) {
            return "이메일 형식을 확인해 주세요.";
        }

        if (!form.address.trim()) {
            return "시설 주소를 입력해 주세요.";
        }

        if (!form.privacyAgreed) {
            return "개인정보 수집 및 이용에 동의해 주세요.";
        }

        return "";
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        const validationMessage =
            validateForm();

        if (validationMessage) {
            setErrorMessage(validationMessage);
            return;
        }

        /*
         * 백엔드 API가 구현되면 아래 부분을
         * axiosInstance.post() 요청으로 교체합니다.
         *
         * await axiosInstance.post(
         *     "/partnership-inquiries",
         *     {
         *         facilityType:
         *             form.facilityType,
         *         facilityName:
         *             form.facilityName.trim(),
         *         managerName:
         *             form.managerName.trim(),
         *         phone: form.phone.trim(),
         *         email: form.email.trim(),
         *         address: form.address.trim(),
         *         message: form.message.trim(),
         *     }
         * );
         */

        setSubmitted(true);
    };

    const handleBackdropMouseDown = (event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    if (submitted) {
        return (
            <div
                className="partnership-modal-backdrop"
                onMouseDown={
                    handleBackdropMouseDown
                }
            >
                <section
                    className="partnership-modal partnership-modal--success"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="partnership-success-title"
                >
                    <button
                        type="button"
                        className="partnership-modal-close"
                        onClick={onClose}
                        aria-label="모달 닫기"
                    >
                        ×
                    </button>

                    <div className="partnership-modal-success-mark">
                        ✓
                    </div>

                    <span>PARTNERSHIP INQUIRY</span>

                    <h2 id="partnership-success-title">
                        문의 내용이 확인되었습니다
                    </h2>

                    <p>
                        현재는 프론트 화면 확인 단계입니다.
                        백엔드 문의 API가 연결되면 입력한
                        내용이 관리자 페이지에 등록됩니다.
                    </p>

                    <button
                        type="button"
                        className="partnership-modal-success-button"
                        onClick={onClose}
                    >
                        확인
                    </button>
                </section>
            </div>
        );
    }

    return (
        <div
            className="partnership-modal-backdrop"
            onMouseDown={handleBackdropMouseDown}
        >
            <section
                className="partnership-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="partnership-modal-title"
            >
                <header className="partnership-modal-header">
                    <div>
                        <span>
                            PARTNERSHIP INQUIRY
                        </span>

                        <h2 id="partnership-modal-title">
                            병원·약국 제휴 문의
                        </h2>

                        <p>
                            제휴 검토에 필요한 시설 정보를
                            입력해 주세요.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="partnership-modal-close"
                        onClick={onClose}
                        aria-label="제휴 문의 닫기"
                    >
                        ×
                    </button>
                </header>

                <form
                    className="partnership-modal-form"
                    onSubmit={handleSubmit}
                >
                    {errorMessage && (
                        <div
                            className="partnership-modal-error"
                            role="alert"
                        >
                            {errorMessage}
                        </div>
                    )}

                    <fieldset className="partnership-type-field">
                        <legend>
                            시설 유형
                            <strong>*</strong>
                        </legend>

                        <div className="partnership-type-options">
                            <label
                                className={
                                    form.facilityType ===
                                    "HOSPITAL"
                                        ? "partnership-type-option partnership-type-option--selected"
                                        : "partnership-type-option"
                                }
                            >
                                <input
                                    type="radio"
                                    name="facilityType"
                                    value="HOSPITAL"
                                    checked={
                                        form.facilityType ===
                                        "HOSPITAL"
                                    }
                                    onChange={handleChange}
                                />

                                <span
                                    className="partnership-type-icon"
                                    aria-hidden="true"
                                >
                                    H
                                </span>

                                <span>
                                    <strong>병원</strong>
                                    <small>
                                        의료기관 제휴
                                    </small>
                                </span>
                            </label>

                            <label
                                className={
                                    form.facilityType ===
                                    "PHARMACY"
                                        ? "partnership-type-option partnership-type-option--selected"
                                        : "partnership-type-option"
                                }
                            >
                                <input
                                    type="radio"
                                    name="facilityType"
                                    value="PHARMACY"
                                    checked={
                                        form.facilityType ===
                                        "PHARMACY"
                                    }
                                    onChange={handleChange}
                                />

                                <span
                                    className="partnership-type-icon"
                                    aria-hidden="true"
                                >
                                    P
                                </span>

                                <span>
                                    <strong>약국</strong>
                                    <small>
                                        약국 시설 제휴
                                    </small>
                                </span>
                            </label>
                        </div>
                    </fieldset>

                    <div className="partnership-form-grid">
                        <label className="partnership-form-field">
                            <span>
                                시설명
                                <strong>*</strong>
                            </span>

                            <input
                                type="text"
                                name="facilityName"
                                value={form.facilityName}
                                maxLength={100}
                                placeholder="병원 또는 약국 이름"
                                onChange={handleChange}
                            />
                        </label>

                        <label className="partnership-form-field">
                            <span>
                                담당자명
                                <strong>*</strong>
                            </span>

                            <input
                                type="text"
                                name="managerName"
                                value={form.managerName}
                                maxLength={50}
                                placeholder="제휴 담당자 이름"
                                onChange={handleChange}
                            />
                        </label>

                        <label className="partnership-form-field">
                            <span>
                                연락처
                                <strong>*</strong>
                            </span>

                            <input
                                type="tel"
                                name="phone"
                                value={form.phone}
                                maxLength={20}
                                placeholder="010-0000-0000"
                                onChange={handleChange}
                            />
                        </label>

                        <label className="partnership-form-field">
                            <span>
                                이메일
                                <strong>*</strong>
                            </span>

                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                maxLength={100}
                                placeholder="partner@example.com"
                                onChange={handleChange}
                            />
                        </label>

                        <label className="partnership-form-field partnership-form-field--full">
                            <span>
                                시설 주소
                                <strong>*</strong>
                            </span>

                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                maxLength={200}
                                placeholder="시설의 도로명 주소를 입력해 주세요."
                                onChange={handleChange}
                            />
                        </label>

                        <label className="partnership-form-field partnership-form-field--full">
                            <span>문의 내용</span>

                            <textarea
                                name="message"
                                value={form.message}
                                maxLength={1000}
                                placeholder="제휴 목적이나 전달할 내용을 입력해 주세요."
                                onChange={handleChange}
                            />

                            <small className="partnership-message-length">
                                {form.message.length} / 1000
                            </small>
                        </label>
                    </div>

                    <label className="partnership-privacy-field">
                        <input
                            type="checkbox"
                            name="privacyAgreed"
                            checked={form.privacyAgreed}
                            onChange={handleChange}
                        />

                        <span>
                            <strong>
                                개인정보 수집 및 이용에
                                동의합니다.
                            </strong>

                            <small>
                                제휴 검토와 연락을 위해
                                담당자명, 연락처, 이메일을
                                수집합니다.
                            </small>
                        </span>
                    </label>

                    <aside className="partnership-modal-notice">
                        제출된 정보는 관리자 검토 후
                        처리되며, 제휴 신청이 자동으로
                        승인되는 것은 아닙니다.
                    </aside>

                    <footer className="partnership-modal-actions">
                        <button
                            type="button"
                            className="partnership-modal-cancel"
                            onClick={onClose}
                        >
                            취소
                        </button>

                        <button
                            type="submit"
                            className="partnership-modal-submit"
                        >
                            제휴 문의 접수
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}