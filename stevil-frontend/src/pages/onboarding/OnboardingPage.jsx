import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./OnboardingPage.css";
import axiosInstance from "../../api/axiosInstance.js";

const initialForm = {
    name: "",
    birthDate: "",
    sex: "",
    heightCm: "",
    currentWeightKg: "",
    targetWeightKg: "",

    visitedHospital: "",
    prescribedGlp1: "",
    medicationName: "",
    dose: "",
    firstInjectionDate: "",

    agreedToHealthData: false,
};

const steps = [
    {
        number: 1,
        title: "기본 정보",
        description: "맞춤 건강 기록에 필요한 기본 정보를 입력해 주세요.",
    },
    {
        number: 2,
        title: "체중과 목표",
        description: "현재 상태와 목표 체중을 알려주세요.",
    },
    {
        number: 3,
        title: "진료와 처방",
        description: "현재 진료 및 처방 상태를 확인할게요.",
    },
];

export default function OnboardingPage() {
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(1);
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState("");

    const progress = useMemo(
        () => `${(currentStep / steps.length) * 100}%`,
        [currentStep],
    );

    const updateField = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));

        setError("");
    };

    const validateStep = () => {
        if (currentStep === 1) {
            if (!form.name.trim() || !form.birthDate || !form.sex || !form.heightCm) {
                return "기본 정보를 모두 입력해 주세요.";
            }

            if (Number(form.heightCm) < 100 || Number(form.heightCm) > 250) {
                return "키를 올바르게 입력해 주세요.";
            }
        }

        if (currentStep === 2) {
            if (!form.currentWeightKg || !form.targetWeightKg) {
                return "현재 체중과 목표 체중을 입력해 주세요.";
            }

            if (
                Number(form.currentWeightKg) < 30 ||
                Number(form.currentWeightKg) > 350 ||
                Number(form.targetWeightKg) < 30 ||
                Number(form.targetWeightKg) > 350
            ) {
                return "체중을 올바르게 입력해 주세요.";
            }
        }

        if (currentStep === 3) {
            if (!form.visitedHospital) {
                return "병원 방문 여부를 선택해 주세요.";
            }

            if (form.visitedHospital === "yes" && !form.prescribedGlp1) {
                return "GLP-1 계열 주사제 처방 여부를 선택해 주세요.";
            }

            if (
                form.prescribedGlp1 === "yes" &&
                (!form.medicationName || !form.firstInjectionDate)
            ) {
                return "처방 약물과 최초 투약일을 입력해 주세요.";
            }

            if (!form.agreedToHealthData) {
                return "건강정보 수집 및 이용에 동의해 주세요.";
            }
        }

        return "";
    };

    const handleNext = () => {
        const validationError = validateStep();

        if (validationError) {
            setError(validationError);
            return;
        }

        setCurrentStep((previous) => Math.min(previous + 1, steps.length));
    };

    const handlePrevious = () => {
        setError("");
        setCurrentStep((previous) => Math.max(previous - 1, 1));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationError = validateStep();

        if (validationError) {
            setError(validationError);
            return;
        }

        const requestBody = {
            name: form.name.trim(),
            birthDate: form.birthDate,
            sex: form.sex,
            heightCm: Number(form.heightCm),
            currentWeightKg: Number(form.currentWeightKg),
            targetWeightKg: Number(form.targetWeightKg),

            visitedHospital: form.visitedHospital === "yes",
            prescribedGlp1:
                form.visitedHospital === "yes" &&
                form.prescribedGlp1 === "yes",

            medicationName:
                form.prescribedGlp1 === "yes"
                    ? form.medicationName
                    : null,

            dose:
                form.prescribedGlp1 === "yes" && form.dose
                    ? form.dose
                    : null,

            firstInjectionDate:
                form.prescribedGlp1 === "yes"
                    ? form.firstInjectionDate
                    : null,
        };

        try {
            await axiosInstance.post("/onboarding", requestBody);

            navigate("/dashboard", { replace: true });
        } catch (submitError) {
            console.error(
                "온보딩 저장 실패:",
                submitError.response?.status,
                submitError.response?.data
            );

            setError(
                submitError.response?.data?.message
                || "온보딩 정보를 저장하지 못했습니다."
            );
        }
    };

    const currentStepInfo = steps[currentStep - 1];

    return (
        <div className="onboarding-page">
            <header className="onboarding-header">
                <button
                    type="button"
                    className="onboarding-logo"
                    onClick={() => navigate("/")}
                >
                    Stevil
                </button>

                <button
                    type="button"
                    className="onboarding-skip"
                    onClick={() => navigate("/dashboard")}
                >
                    나중에 입력
                </button>
            </header>

            <main className="onboarding-main">
                <section className="onboarding-card">
                    <div className="onboarding-progress-area">
                        <div className="onboarding-step-text">
              <span>
                STEP {currentStep} / {steps.length}
              </span>
                            <strong>{Math.round((currentStep / steps.length) * 100)}%</strong>
                        </div>

                        <div
                            className="onboarding-progress"
                            role="progressbar"
                            aria-valuemin="1"
                            aria-valuemax={steps.length}
                            aria-valuenow={currentStep}
                        >
                            <span style={{ width: progress }} />
                        </div>
                    </div>

                    <div className="onboarding-heading">
            <span className="onboarding-step-number">
              {String(currentStep).padStart(2, "0")}
            </span>

                        <div>
                            <h1>{currentStepInfo.title}</h1>
                            <p>{currentStepInfo.description}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {currentStep === 1 && (
                            <div className="onboarding-fields">
                                <label className="onboarding-field">
                                    <span>이름</span>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={updateField}
                                        placeholder="이름을 입력해 주세요"
                                        autoComplete="name"
                                    />
                                </label>

                                <label className="onboarding-field">
                                    <span>생년월일</span>
                                    <input
                                        type="date"
                                        name="birthDate"
                                        value={form.birthDate}
                                        onChange={updateField}
                                    />
                                </label>

                                <fieldset className="onboarding-field">
                                    <legend>성별</legend>

                                    <div className="onboarding-choice-grid">
                                        <label className="onboarding-choice">
                                            <input
                                                type="radio"
                                                name="sex"
                                                value="MALE"
                                                checked={form.sex === "MALE"}
                                                onChange={updateField}
                                            />
                                            <span>남성</span>
                                        </label>

                                        <label className="onboarding-choice">
                                            <input
                                                type="radio"
                                                name="sex"
                                                value="FEMALE"
                                                checked={form.sex === "FEMALE"}
                                                onChange={updateField}
                                            />
                                            <span>여성</span>
                                        </label>
                                    </div>
                                </fieldset>

                                <label className="onboarding-field">
                                    <span>키</span>

                                    <div className="onboarding-unit-input">
                                        <input
                                            type="number"
                                            name="heightCm"
                                            value={form.heightCm}
                                            onChange={updateField}
                                            min="100"
                                            max="250"
                                            step="0.1"
                                            placeholder="170"
                                        />
                                        <span>cm</span>
                                    </div>
                                </label>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="onboarding-fields">
                                <label className="onboarding-field">
                                    <span>현재 체중</span>

                                    <div className="onboarding-unit-input">
                                        <input
                                            type="number"
                                            name="currentWeightKg"
                                            value={form.currentWeightKg}
                                            onChange={updateField}
                                            min="30"
                                            max="350"
                                            step="0.1"
                                            placeholder="현재 체중"
                                        />
                                        <span>kg</span>
                                    </div>
                                </label>

                                <label className="onboarding-field">
                                    <span>목표 체중</span>

                                    <div className="onboarding-unit-input">
                                        <input
                                            type="number"
                                            name="targetWeightKg"
                                            value={form.targetWeightKg}
                                            onChange={updateField}
                                            min="30"
                                            max="350"
                                            step="0.1"
                                            placeholder="목표 체중"
                                        />
                                        <span>kg</span>
                                    </div>
                                </label>

                                {form.currentWeightKg &&
                                    form.targetWeightKg && (
                                        <div className="onboarding-summary">
                                            <span>목표까지</span>
                                            <strong>
                                                {Math.abs(
                                                    Number(form.currentWeightKg) -
                                                    Number(form.targetWeightKg),
                                                ).toFixed(1)}
                                                kg
                                            </strong>
                                            <p>
                                                목표는 언제든지 설정에서 변경할 수 있습니다.
                                            </p>
                                        </div>
                                    )}
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="onboarding-fields">
                                <fieldset className="onboarding-field">
                                    <legend>최근 병원에 방문하셨나요?</legend>

                                    <div className="onboarding-choice-grid">
                                        <label className="onboarding-choice">
                                            <input
                                                type="radio"
                                                name="visitedHospital"
                                                value="yes"
                                                checked={form.visitedHospital === "yes"}
                                                onChange={updateField}
                                            />
                                            <span>네, 방문했어요</span>
                                        </label>

                                        <label className="onboarding-choice">
                                            <input
                                                type="radio"
                                                name="visitedHospital"
                                                value="no"
                                                checked={form.visitedHospital === "no"}
                                                onChange={updateField}
                                            />
                                            <span>아직 방문하지 않았어요</span>
                                        </label>
                                    </div>
                                </fieldset>

                                {form.visitedHospital === "yes" && (
                                    <fieldset className="onboarding-field">
                                        <legend>GLP-1 계열 주사제를 처방받으셨나요?</legend>

                                        <div className="onboarding-choice-grid">
                                            <label className="onboarding-choice">
                                                <input
                                                    type="radio"
                                                    name="prescribedGlp1"
                                                    value="yes"
                                                    checked={form.prescribedGlp1 === "yes"}
                                                    onChange={updateField}
                                                />
                                                <span>네, 처방받았어요</span>
                                            </label>

                                            <label className="onboarding-choice">
                                                <input
                                                    type="radio"
                                                    name="prescribedGlp1"
                                                    value="no"
                                                    checked={form.prescribedGlp1 === "no"}
                                                    onChange={updateField}
                                                />
                                                <span>아니요</span>
                                            </label>
                                        </div>
                                    </fieldset>
                                )}

                                {form.visitedHospital === "yes" &&
                                    form.prescribedGlp1 === "yes" && (
                                        <div className="onboarding-prescription">
                                            <label className="onboarding-field">
                                                <span>처방 약물</span>

                                                <select
                                                    name="medicationName"
                                                    value={form.medicationName}
                                                    onChange={updateField}
                                                    required={form.hasVisitedHospital === true}
                                                >
                                                    <option value="">선택해 주세요</option>
                                                    <option value="WEGOVY">위고비</option>
                                                    <option value="SAXENDA">삭센다</option>
                                                    <option value="MOUNJARO">마운자로</option>
                                                    <option value="OTHER">기타</option>
                                                </select>
                                            </label>

                                            <label className="onboarding-field">
                                                <span>현재 처방 용량</span>
                                                <input
                                                    type="text"
                                                    name="dose"
                                                    value={form.dose}
                                                    onChange={updateField}
                                                    placeholder="처방전에 적힌 용량을 입력해 주세요"
                                                />
                                            </label>

                                            <label className="onboarding-field">
                                                <span>최초 투약일</span>
                                                <input
                                                    type="date"
                                                    name="firstInjectionDate"
                                                    value={form.firstInjectionDate}
                                                    onChange={updateField}
                                                    required={form.hasVisitedHospital === true}
                                                />
                                            </label>

                                            <p className="onboarding-medical-notice">
                                                처방전 또는 의료진에게 안내받은 내용만 입력해
                                                주세요. Stevil은 약물이나 용량을 처방하지
                                                않습니다.
                                            </p>
                                        </div>
                                    )}

                                <label className="onboarding-consent">
                                    <input
                                        type="checkbox"
                                        name="agreedToHealthData"
                                        checked={form.agreedToHealthData}
                                        onChange={updateField}
                                    />
                                    <span>
                    건강 기록 제공을 위한 민감정보 수집 및 이용에
                    동의합니다. <a href="/privacy">자세히 보기</a>
                  </span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <p className="onboarding-error" role="alert">
                                {error}
                            </p>
                        )}

                        <div className="onboarding-actions">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    className="onboarding-button onboarding-button--previous"
                                    onClick={handlePrevious}
                                >
                                    이전
                                </button>
                            )}

                            {currentStep < steps.length ? (
                                <button
                                    type="button"
                                    className="onboarding-button onboarding-button--primary"
                                    onClick={handleNext}
                                >
                                    다음
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="onboarding-button onboarding-button--primary"
                                >
                                    Stevil 시작하기
                                </button>
                            )}
                        </div>
                    </form>
                </section>
            </main>
        </div>
    );
}