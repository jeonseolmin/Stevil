import { useEffect, useMemo, useState } from "react";
import "./PlannerModal.css";

const STEP = {
    BASIC: "basic",
    HOTEL: "hotel",
    FOOD: "food",
};

const formatDate = (dateString) => {
    if (!dateString) {
        return "";
    }

    const [year, month, day] = dateString.split("-");

    return `${Number(month)}월 ${Number(day)}일`;
};

const createDateRange = (startDate, endDate) => {
    if (!startDate || !endDate || startDate > endDate) {
        return [];
    }

    const dates = [];
    const currentDate = new Date(`${startDate}T00:00:00`);
    const lastDate = new Date(`${endDate}T00:00:00`);

    while (currentDate <= lastDate) {
        dates.push(
            [
                currentDate.getFullYear(),
                String(currentDate.getMonth() + 1).padStart(2, "0"),
                String(currentDate.getDate()).padStart(2, "0"),
            ].join("-"),
        );

        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
};

export default function PlannerModal({
                                         initialPrompt = "",
                                         onClose,
                                         onComplete,
                                     }) {
    const [activeStep, setActiveStep] = useState(STEP.BASIC);

    const [basicInfo, setBasicInfo] = useState({
        destination: "",
        startDate: "",
        endDate: "",
        travelers: 1,
        budget: "",
    });

    const [useSameHotel, setUseSameHotel] = useState(true);
    const [selectedHotelTab, setSelectedHotelTab] = useState(0);
    const [selectedFoodDay, setSelectedFoodDay] = useState(0);

    const [hotels, setHotels] = useState([]);
    const [meals, setMeals] = useState([]);

    const tripDates = useMemo(
        () => createDateRange(basicInfo.startDate, basicInfo.endDate),
        [basicInfo.startDate, basicInfo.endDate],
    );

    const hotelDates = tripDates.slice(0, -1);

    const tripDays = tripDates.length;
    const tripNights = Math.max(tripDays - 1, 0);

    useEffect(() => {
        setHotels((previousHotels) =>
            hotelDates.map((date, index) => ({
                date,
                hotel: previousHotels[index]?.hotel ?? null,
            })),
        );

        setMeals((previousMeals) =>
            tripDates.map((date, index) => ({
                date,
                breakfast: previousMeals[index]?.breakfast ?? null,
                lunch: previousMeals[index]?.lunch ?? null,
                dinner: previousMeals[index]?.dinner ?? null,
            })),
        );

        setSelectedHotelTab(0);
        setSelectedFoodDay(0);
    }, [basicInfo.startDate, basicInfo.endDate]);

    const handleBasicInfoChange = (event) => {
        const { name, value } = event.target;

        setBasicInfo((previousInfo) => ({
            ...previousInfo,
            [name]: name === "travelers" ? Number(value) : value,
        }));
    };

    const handleBasicSubmit = (event) => {
        event.preventDefault();

        if (
            !basicInfo.destination.trim() ||
            !basicInfo.startDate ||
            !basicInfo.endDate
        ) {
            return;
        }

        setActiveStep(STEP.HOTEL);
    };

    const handleHotelComplete = () => {
        setActiveStep(STEP.FOOD);
    };

    const handlePlannerComplete = () => {
        onComplete?.({
            prompt: initialPrompt,
            basicInfo,
            hotels: {
                useSameHotel,
                nights: hotels,
            },
            meals,
        });
    };

    const toggleStep = (step) => {
        setActiveStep((currentStep) =>
            currentStep === step ? null : step,
        );
    };

    return (
        <div
            className="planner-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose?.();
                }
            }}
        >
            <section
                className="planner-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="planner-title"
            >
                <header className="planner-header">
                    <div>
                        <p className="planner-eyebrow">
                            AI 여행 플래너
                        </p>

                        <h2 id="planner-title">
                            여행 일정을 만들어볼까요?
                        </h2>

                        {initialPrompt && (
                            <p className="planner-prompt">
                                “{initialPrompt}”
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        className="planner-close-button"
                        onClick={onClose}
                        aria-label="플래너 닫기"
                    >
                        ×
                    </button>
                </header>

                <div className="planner-content">
                    <article className="planner-step">
                        <button
                            type="button"
                            className="planner-step-header"
                            onClick={() => toggleStep(STEP.BASIC)}
                            aria-expanded={activeStep === STEP.BASIC}
                        >
                            <span className="planner-step-number">
                                1
                            </span>

                            <span className="planner-step-heading">
                                <strong>기본 정보</strong>

                                <small>
                                    {tripDays > 0
                                        ? `${basicInfo.destination} · ${tripNights}박 ${tripDays}일`
                                        : "여행지와 기간을 입력해주세요"}
                                </small>
                            </span>

                            <span className="planner-step-arrow">
                                {activeStep === STEP.BASIC ? "−" : "+"}
                            </span>
                        </button>

                        {activeStep === STEP.BASIC && (
                            <form
                                className="planner-step-body"
                                onSubmit={handleBasicSubmit}
                            >
                                <label className="planner-field planner-field--wide">
                                    <span>여행지</span>

                                    <input
                                        type="text"
                                        name="destination"
                                        value={basicInfo.destination}
                                        onChange={handleBasicInfoChange}
                                        placeholder="예: 부산"
                                        required
                                    />
                                </label>

                                <div className="planner-field-row">
                                    <label className="planner-field">
                                        <span>여행 시작일</span>

                                        <input
                                            type="date"
                                            name="startDate"
                                            value={basicInfo.startDate}
                                            onChange={handleBasicInfoChange}
                                            required
                                        />
                                    </label>

                                    <label className="planner-field">
                                        <span>여행 종료일</span>

                                        <input
                                            type="date"
                                            name="endDate"
                                            min={basicInfo.startDate}
                                            value={basicInfo.endDate}
                                            onChange={handleBasicInfoChange}
                                            required
                                        />
                                    </label>
                                </div>

                                <div className="planner-field-row">
                                    <label className="planner-field">
                                        <span>여행 인원</span>

                                        <input
                                            type="number"
                                            name="travelers"
                                            min="1"
                                            max="20"
                                            value={basicInfo.travelers}
                                            onChange={handleBasicInfoChange}
                                        />
                                    </label>

                                    <label className="planner-field">
                                        <span>예산</span>

                                        <input
                                            type="number"
                                            name="budget"
                                            min="0"
                                            step="10000"
                                            value={basicInfo.budget}
                                            onChange={handleBasicInfoChange}
                                            placeholder="예: 500000"
                                        />
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="planner-primary-button"
                                >
                                    호텔 선택으로 이동
                                </button>
                            </form>
                        )}
                    </article>

                    <article className="planner-step">
                        <button
                            type="button"
                            className="planner-step-header"
                            onClick={() => toggleStep(STEP.HOTEL)}
                            aria-expanded={activeStep === STEP.HOTEL}
                            disabled={tripNights === 0}
                        >
                            <span className="planner-step-number">
                                2
                            </span>

                            <span className="planner-step-heading">
                                <strong>호텔</strong>

                                <small>
                                    {tripNights > 0
                                        ? `${tripNights}박의 숙소를 선택해주세요`
                                        : "기본 정보를 먼저 입력해주세요"}
                                </small>
                            </span>

                            <span className="planner-step-arrow">
                                {activeStep === STEP.HOTEL ? "−" : "+"}
                            </span>
                        </button>

                        {activeStep === STEP.HOTEL && tripNights > 0 && (
                            <div className="planner-step-body">
                                <label className="planner-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={useSameHotel}
                                        onChange={(event) =>
                                            setUseSameHotel(
                                                event.target.checked,
                                            )
                                        }
                                    />

                                    <span>
                                        전 일정 같은 호텔 이용
                                    </span>
                                </label>

                                <div className="planner-date-tabs">
                                    {hotelDates.map((date, index) => (
                                        <button
                                            type="button"
                                            key={date}
                                            className={
                                                selectedHotelTab === index
                                                    ? "planner-date-tab planner-date-tab--active"
                                                    : "planner-date-tab"
                                            }
                                            onClick={() =>
                                                setSelectedHotelTab(index)
                                            }
                                        >
                                            <strong>{index + 1}박차</strong>
                                            <small>{formatDate(date)}</small>
                                        </button>
                                    ))}
                                </div>

                                <div className="planner-empty-state">
                                    <span>🏨</span>

                                    <strong>
                                        {selectedHotelTab + 1}박차 호텔
                                    </strong>

                                    <p>
                                        추후 호텔 검색 API 결과가 이곳에
                                        표시됩니다.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="planner-primary-button"
                                    onClick={handleHotelComplete}
                                >
                                    음식 선택으로 이동
                                </button>
                            </div>
                        )}
                    </article>

                    <article className="planner-step">
                        <button
                            type="button"
                            className="planner-step-header"
                            onClick={() => toggleStep(STEP.FOOD)}
                            aria-expanded={activeStep === STEP.FOOD}
                            disabled={tripDays === 0}
                        >
                            <span className="planner-step-number">
                                3
                            </span>

                            <span className="planner-step-heading">
                                <strong>음식</strong>

                                <small>
                                    {tripDays > 0
                                        ? `${tripDays}일 동안의 식사를 선택해주세요`
                                        : "기본 정보를 먼저 입력해주세요"}
                                </small>
                            </span>

                            <span className="planner-step-arrow">
                                {activeStep === STEP.FOOD ? "−" : "+"}
                            </span>
                        </button>

                        {activeStep === STEP.FOOD && tripDays > 0 && (
                            <div className="planner-step-body">
                                <div className="planner-date-tabs">
                                    {tripDates.map((date, index) => (
                                        <button
                                            type="button"
                                            key={date}
                                            className={
                                                selectedFoodDay === index
                                                    ? "planner-date-tab planner-date-tab--active"
                                                    : "planner-date-tab"
                                            }
                                            onClick={() =>
                                                setSelectedFoodDay(index)
                                            }
                                        >
                                            <strong>{index + 1}일차</strong>
                                            <small>{formatDate(date)}</small>
                                        </button>
                                    ))}
                                </div>

                                <div className="planner-meal-list">
                                    {["아침", "점심", "저녁"].map(
                                        (mealName) => (
                                            <div
                                                className="planner-meal-row"
                                                key={mealName}
                                            >
                                                <strong>{mealName}</strong>

                                                <span>
                                                    음식점 검색 결과가
                                                    표시됩니다.
                                                </span>

                                                <button type="button">
                                                    선택
                                                </button>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="planner-primary-button"
                                    onClick={handlePlannerComplete}
                                >
                                    여행 일정 만들기
                                </button>
                            </div>
                        )}
                    </article>
                </div>
            </section>
        </div>
    );
}