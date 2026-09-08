import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance"; 

import "./WeightRecordPage.css";

function getCurrentLocalDateTime() {
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60_000;

    return new Date(now.getTime() - timezoneOffset)
        .toISOString()
        .slice(0, 16);
}

function formatDisplayDate(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export default function WeightRecordPage() {
    const navigate = useNavigate();

    const [weight, setWeight] = useState("");
    const [targetWeight, setTargetWeight] = useState("");
    const [recordedAt, setRecordedAt] = useState(
        getCurrentLocalDateTime()
    );

    const [errorMessage, setErrorMessage] = useState("");
    const [submittedData, setSubmittedData] = useState(null);

    const weightNumber = Number(weight);
    const targetWeightNumber = Number(targetWeight);

    const difference = useMemo(() => {
        if (
            !Number.isFinite(weightNumber)
            || !Number.isFinite(targetWeightNumber)
            || weight === ""
            || targetWeight === ""
        ) {
            return null;
        }

        return weightNumber - targetWeightNumber;
    }, [
        weight,
        targetWeight,
        weightNumber,
        targetWeightNumber,
    ]);

    const validateForm = () => {
        if (!weight) {
            return "오늘의 체중을 입력해 주세요.";
        }

        if (
            !Number.isFinite(weightNumber)
            || weightNumber < 20
            || weightNumber > 400
        ) {
            return "체중은 20kg 이상 400kg 이하로 입력해 주세요.";
        }

        if (
            targetWeight
            && (
                !Number.isFinite(targetWeightNumber)
                || targetWeightNumber < 20
                || targetWeightNumber > 400
            )
        ) {
            return "목표 체중은 20kg 이상 400kg 이하로 입력해 주세요.";
        }

        if (!recordedAt) {
            return "측정 날짜와 시간을 입력해 주세요.";
        }

        const selectedTime = new Date(recordedAt).getTime();
        const currentTime = Date.now();

        if (
            Number.isNaN(selectedTime)
            || selectedTime > currentTime + 60_000
        ) {
            return "현재보다 미래의 시간은 기록할 수 없습니다.";
        }

        return "";
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationMessage = validateForm();

        if (validationMessage) {
            setErrorMessage(validationMessage);
            setSubmittedData(null);
            return;
        }

        const payload = {
            weight: Number(weightNumber.toFixed(1)),
            targetWeight: targetWeight
                ? Number(targetWeightNumber.toFixed(1))
                : null,
            recordedAt: `${recordedAt}:00`,
        };

        try {
            await axiosInstance.post("/weights", payload);
            
            setErrorMessage("");
            setSubmittedData(payload);
            
            alert("체중 기록이 성공적으로 저장되었습니다.");
            navigate("/dashboard"); // 저장 후 대시보드로 이동
            
        } catch (error) {
            console.error("체중 기록 저장 실패:", error);
            setErrorMessage(error.response?.data || "저장에 실패했습니다. 다시 시도해주세요.");
            setSubmittedData(null);
        }
    };

    const handleReset = () => {
        setWeight("");
        setTargetWeight("");
        setRecordedAt(getCurrentLocalDateTime());
        setErrorMessage("");
        setSubmittedData(null);
    };

    return (
        <div className="weight-record-page">
            <div className="weight-record-container">
                <header className="weight-record-header">
                    <button
                        type="button"
                        className="weight-back-button"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← 대시보드
                    </button>

                    <span className="weight-record-eyebrow">
                        TODAY'S WEIGHT
                    </span>

                    <h1>오늘의 체중 기록</h1>

                    <p>
                        같은 시간과 비슷한 조건에서 꾸준히
                        측정하면 체중 변화의 흐름을 더 정확하게
                        확인할 수 있습니다.
                    </p>
                </header>

                <div className="weight-record-layout">
                    <form
                        className="weight-record-card"
                        onSubmit={handleSubmit}
                        noValidate
                    >
                        <div className="weight-form-heading">
                            <div>
                                <span>체중 입력</span>
                                <h2>오늘의 기록을 남겨주세요</h2>
                            </div>

                            <span className="weight-form-required">
                                * 필수 입력
                            </span>
                        </div>

                        <div className="weight-form-group">
                            <label htmlFor="weight">
                                오늘의 체중
                                <span aria-hidden="true">*</span>
                            </label>

                            <div className="weight-input-wrapper">
                                <input
                                    id="weight"
                                    type="number"
                                    inputMode="decimal"
                                    min="20"
                                    max="400"
                                    step="0.1"
                                    value={weight}
                                    onChange={(event) => {
                                        setWeight(
                                            event.target.value
                                        );
                                        setErrorMessage("");
                                        setSubmittedData(null);
                                    }}
                                    placeholder="예: 112.5"
                                    autoFocus
                                />

                                <span>kg</span>
                            </div>

                            <small>
                                소수점 첫째 자리까지 입력할 수
                                있습니다.
                            </small>
                        </div>

                        <div className="weight-form-group">
                            <label htmlFor="targetWeight">
                                목표 체중
                                <em>선택</em>
                            </label>

                            <div className="weight-input-wrapper">
                                <input
                                    id="targetWeight"
                                    type="number"
                                    inputMode="decimal"
                                    min="20"
                                    max="400"
                                    step="0.1"
                                    value={targetWeight}
                                    onChange={(event) => {
                                        setTargetWeight(
                                            event.target.value
                                        );
                                        setErrorMessage("");
                                        setSubmittedData(null);
                                    }}
                                    placeholder="예: 88.0"
                                />

                                <span>kg</span>
                            </div>

                            <small>
                                기존 목표를 변경하지 않는다면
                                비워두셔도 됩니다.
                            </small>
                        </div>

                        <div className="weight-form-group">
                            <label htmlFor="recordedAt">
                                측정 날짜와 시간
                                <span aria-hidden="true">*</span>
                            </label>

                            <input
                                id="recordedAt"
                                className="weight-date-input"
                                type="datetime-local"
                                max={getCurrentLocalDateTime()}
                                value={recordedAt}
                                onChange={(event) => {
                                    setRecordedAt(
                                        event.target.value
                                    );
                                    setErrorMessage("");
                                    setSubmittedData(null);
                                }}
                            />

                            <small>
                                기본값은 현재 시각입니다.
                            </small>
                        </div>

                        {errorMessage && (
                            <div
                                className="weight-form-error"
                                role="alert"
                            >
                                {errorMessage}
                            </div>
                        )}

                        {submittedData && (
                            <div
                                className="weight-form-success"
                                role="status"
                            >
                                <strong>
                                    데이터 처리 중입니다...
                                </strong>
                            </div>
                        )}

                        <div className="weight-form-actions">
                            <button
                                type="button"
                                className="weight-reset-button"
                                onClick={handleReset}
                            >
                                다시 입력
                            </button>

                            <button
                                type="submit"
                                className="weight-submit-button"
                            >
                                기록 확인
                            </button>
                        </div>
                    </form>

                    <aside className="weight-preview-card">
                        <span className="weight-preview-label">
                            RECORD PREVIEW
                        </span>

                        <h2>입력 내용 미리보기</h2>

                        <div className="weight-preview-value">
                            <strong>
                                {weight
                                    ? Number(weight).toFixed(1)
                                    : "-"}
                            </strong>
                            <span>kg</span>
                        </div>

                        <dl className="weight-preview-list">
                            <div>
                                <dt>측정 시각</dt>
                                <dd>
                                    {formatDisplayDate(recordedAt)}
                                </dd>
                            </div>

                            <div>
                                <dt>목표 체중</dt>
                                <dd>
                                    {targetWeight
                                        ? `${Number(
                                            targetWeight
                                        ).toFixed(1)}kg`
                                        : "기존 목표 유지"}
                                </dd>
                            </div>

                            <div>
                                <dt>목표까지</dt>
                                <dd>
                                    {difference === null
                                        ? "-"
                                        : difference > 0
                                            ? `${difference.toFixed(
                                                1
                                            )}kg`
                                            : "목표 달성"}
                                </dd>
                            </div>
                        </dl>

                        <div className="weight-measurement-guide">
                            <strong>체중 측정 팁</strong>

                            <ul>
                                <li>
                                    아침 기상 후 화장실을 다녀온
                                    뒤 측정해 보세요.
                                </li>
                                <li>
                                    비슷한 복장과 같은 체중계를
                                    사용해 주세요.
                                </li>
                                <li>
                                    하루 수치보다 주간 평균 변화가
                                    더 중요합니다.
                                </li>
                            </ul>
                        </div>
                    </aside>
                </div>

                <aside className="weight-medical-notice">
                    <strong>체중 변화 안내</strong>

                    <p>
                        체중은 수분, 염분, 탄수화물 섭취와
                        배변 상태 등에 따라 하루에도 달라질 수
                        있습니다. 하루의 증감보다는 장기간의
                        추세를 확인해 주세요.
                    </p>
                </aside>
            </div>
        </div>
    );
}