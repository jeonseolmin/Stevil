import { useEffect, useRef, useState } from "react";

import {
    loadWeek,
    generateWeek,
    saveWeek,
    loadPlannerProfile,
    loadSnackCatalog
} from "../../api/plannerApi";

import {
    DAYS,
    defaults,
    exampleWeek,
    monday,
    shiftDate,
    validatePlan,
    mealCalories,
    dayNutrition,
    calorieTargetStatus,
    dateKey,
    estimateCalories,
    defaultExerciseWindow
} from "./plannerUtils";

import "./WeeklyPlanner.css";

import { snackRecommendations } from "./snackRecommendations.js";
import ExerciseDetails from "./ExerciseDetails";
import { updatePlannerEvent } from "./plannerEventUtils";


function formatNutrient(value) {

    if (
        value == null
        || String(value).trim() === ""
    ) {
        return "—";
    }

    const number =
        Number(value);

    return (
        Number.isFinite(number)
        && number >= 0
    )
        ? number.toLocaleString(
            "ko-KR",
            {
                maximumFractionDigits: 1
            }
        )
        : "—";
}


function roundOneDecimal(value) {

    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return null;
    }

    return (
        Math.round(
            number * 10
        ) / 10
    );
}


/**
 * PlannerProfileResponse에서 내려온
 * Diet 목표를 Planner용 nutritionGoal로 변환한다.
 *
 * Diet 목표가 존재하면:
 *
 * targetProtein
 *      ↓
 * targetProtein / weightKg
 *      ↓
 * proteinPerKg
 *
 * 로 변환한다.
 *
 * 이렇게 하면 기존 Python Planner의
 *
 * weightKg * proteinPerKg
 *
 * 구조를 그대로 유지하면서도
 * Diet와 같은 목표 단백질을 사용할 수 있다.
 */
function createNutritionGoalFromProfile(
    profile,
    fallbackActivity = 1.4
) {

    if (
        !profile
        || !Number(profile.weightKg)
    ) {
        return null;
    }

    const weightKg =
        Number(profile.weightKg);

    const dietProtein =
        Number(profile.targetProtein);

    const dietCalories =
        Number(profile.targetCalories);

    const hasDietProtein =
        Number.isFinite(dietProtein)
        && dietProtein > 0;

    const hasDietCalories =
        Number.isFinite(dietCalories)
        && dietCalories >= 1000
        && dietCalories <= 5000;

    const proteinPerKg =
        hasDietProtein
            ? dietProtein / weightKg
            : 0.8;

    const calories =
        hasDietCalories
            ? dietCalories
            : (
                estimateCalories(
                    weightKg,
                    profile,
                    fallbackActivity
                ) || 0
            );

    return {
        weightKg,

        proteinPerKg:
            roundOneDecimal(
                proteinPerKg
            ) ?? 0.8,

        calories,

        confirmed: false
    };
}


/**
 * 저장된 Planner 목표가 있어도,
 * Diet에 최신 Protein First 목표가 있다면
 * 단백질/칼로리는 Diet 기준으로 동기화한다.
 *
 * 사용자가 Planner에서 입력한 기준 체중은 유지한다.
 */
function syncNutritionGoalWithProfile(
    goal,
    profile,
    fallbackActivity = 1.4
) {

    if (!goal) {
        return null;
    }

    if (!profile) {
        return goal;
    }

    const currentWeight =
        Number(goal.weightKg)
        || Number(profile.weightKg)
        || 0;

    if (currentWeight <= 0) {
        return goal;
    }

    const dietProtein =
        Number(profile.targetProtein);

    const dietCalories =
        Number(profile.targetCalories);

    const hasDietProtein =
        Number.isFinite(dietProtein)
        && dietProtein > 0;

    const hasDietCalories =
        Number.isFinite(dietCalories)
        && dietCalories >= 1000
        && dietCalories <= 5000;

    return {
        ...goal,

        weightKg:
        currentWeight,

        proteinPerKg:
            hasDietProtein
                ? dietProtein / currentWeight
                : goal.proteinPerKg,

        calories:
            hasDietCalories
                ? dietCalories
                : (
                    goal.calories
                    || estimateCalories(
                        currentWeight,
                        profile,
                        fallbackActivity
                    )
                    || 0
                )
    };
}


function Macros({
                    evidence,
                    compact = false,
                    rounded = false
                }) {

    const labels = [
        [
            "INFO_CAR",
            "탄수화물",
            "탄"
        ],
        [
            "INFO_PRO",
            "단백질",
            "단"
        ],
        [
            "INFO_FAT",
            "지방",
            "지"
        ]
    ];

    return (
        <span
            className={
                compact
                    ? "planner-macros planner-macros--compact"
                    : "planner-macros"
            }
            aria-label="탄수화물 단백질 지방 원문 수치"
        >
            {
                labels.map(
                    (
                        [
                            key,
                            label,
                            short
                        ]
                    ) => (
                        <span key={key}>
                            <span>
                                {
                                    compact
                                        ? short
                                        : label
                                }
                            </span>

                            <b>
                                {
                                    rounded
                                        ? formatNutrient(
                                            evidence
                                                ?.nutrition
                                                ?.[key]
                                        )
                                        : (
                                            evidence
                                                ?.nutrition
                                                ?.[key]
                                                ?.trim()
                                            || "—"
                                        )
                                }
                            </b>
                        </span>
                    )
                )
            }
        </span>
    );
}


function MealComponents({
                            components
                        }) {

    return (
        <div
            className="planner-meal-components"
            aria-label="한 끼 구성 음식"
        >
            {
                components.map(
                    food => (
                        <details key={food.foodId}>

                            <summary>
                                <span>
                                    {food.name}
                                </span>

                                <b>
                                    {food.servingWeight}g
                                </b>
                            </summary>

                            <p>
                                제안량 기준{" "}

                                {
                                    food.role === "snack"
                                        ? formatNutrient(
                                            food
                                                .amountNutrition
                                                .INFO_ENG
                                        )
                                        : Number(
                                            food
                                                .amountNutrition
                                                .INFO_ENG
                                        ).toFixed(0)
                                }

                                {" "}kcal · 단백질{" "}

                                {
                                    Number(
                                        food
                                            .amountNutrition
                                            .INFO_PRO
                                    ).toFixed(1)
                                }

                                g
                            </p>

                            <Macros
                                evidence={{
                                    nutrition:
                                    food.amountNutrition
                                }}
                                compact
                                rounded={
                                    food.role === "snack"
                                }
                            />

                            <p>
                                원문 {food.basisWeight}g 기준
                                {" "}→ 제안량{" "}
                                {food.servingWeight}g으로 환산
                            </p>

                            <p>
                                식품코드 {food.foodId}
                                {" · "}
                                {
                                    food
                                        .retrievedAt
                                        .slice(0, 10)
                                } 수집
                            </p>

                            {
                                food.sourceUrl
                                ===
                                "https://www.data.go.kr/data/15127578/openapi.do"
                                && (
                                    <a
                                        href={food.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        식약처 영양정보 출처 ↗
                                    </a>
                                )
                            }

                        </details>
                    )
                )
            }
        </div>
    );
}


export default function WeeklyPlanner({
                                          preview = false
                                      }) {

    const demo =
        import.meta.env.DEV
        && preview;

    const [
        week,
        setWeek
    ] =
        useState(monday);

    const [
        preferences,
        setPreferences
    ] =
        useState(
            () =>
                defaults(
                    monday()
                )
        );

    const [
        profile,
        setProfile
    ] =
        useState(null);

    const [
        snacks,
        setSnacks
    ] =
        useState([]);

    const [
        snackError,
        setSnackError
    ] =
        useState(false);

    const [
        profileError,
        setProfileError
    ] =
        useState("");

    const [
        activity,
        setActivity
    ] =
        useState(1.4);

    const [
        autoCalories,
        setAutoCalories
    ] =
        useState(true);

    const [
        events,
        setEvents
    ] =
        useState([]);

    const [
        revision,
        setRevision
    ] =
        useState(0);

    const [
        dirty,
        setDirty
    ] =
        useState(false);

    const [
        formOpen,
        setFormOpen
    ] =
        useState(false);

    const [
        selected,
        setSelected
    ] =
        useState(null);

    const [
        summaryDate,
        setSummaryDate
    ] =
        useState(
            () =>
                dateKey(
                    new Date()
                )
        );

    const [
        status,
        setStatus
    ] =
        useState("");

    const [
        error,
        setError
    ] =
        useState("");

    const [
        notices,
        setNotices
    ] =
        useState([]);

    const [
        busy,
        setBusy
    ] =
        useState("");

    const [
        loaded,
        setLoaded
    ] =
        useState(false);

    const [
        reload,
        setReload
    ] =
        useState(0);

    const previewWeeks =
        useRef(
            new Map()
        );

    const operation =
        useRef(false);

    const editor =
        useRef(null);

    const snackPanel =
        useRef(null);

    const [
        focusSnack,
        setFocusSnack
    ] =
        useState(0);


    // =========================================================
    // Diet 목표 사용 여부
    // =========================================================

    const hasDietProteinGoal =
        Number(profile?.targetProtein) > 0;

    const hasDietCalorieGoal =
        Number(profile?.targetCalories) >= 1000
        && Number(profile?.targetCalories) <= 5000;

    const hasDietGoal =
        hasDietProteinGoal
        || hasDietCalorieGoal;


    // =========================================================
    // Effect
    // =========================================================

    useEffect(
        () => {

            if (focusSnack) {

                snackPanel
                    .current
                    ?.scrollIntoView({
                        block: "nearest",
                        behavior: "smooth"
                    });
            }

        },
        [focusSnack]
    );


    useEffect(
        () => {

            const refresh =
                event => {

                    if (
                        demo
                        || operation.current
                        || (
                            event.detail?.week
                            && event.detail.week
                            !== week
                        )
                    ) {
                        return;
                    }

                    if (dirty) {

                        setError(
                            "다른 화면에서 계획이 변경되었을 수 있어요. 저장 전 변경 내용을 확인하거나 다시 불러와 주세요."
                        );

                    } else {

                        setReload(
                            value =>
                                value + 1
                        );
                    }
                };

            window.addEventListener(
                "planner:saved",
                refresh
            );

            window.addEventListener(
                "focus",
                refresh
            );

            return () => {

                window.removeEventListener(
                    "planner:saved",
                    refresh
                );

                window.removeEventListener(
                    "focus",
                    refresh
                );
            };

        },
        [
            demo,
            dirty,
            week
        ]
    );


    useEffect(
        () => {

            if (selected) {

                editor
                    .current
                    ?.scrollIntoView({
                        block: "nearest"
                    });
            }

        },
        [selected]
    );


    // =========================================================
    // Planner 초기 데이터
    // =========================================================

    useEffect(
        () => {

            let active =
                true;

            async function load() {

                setLoaded(false);
                setError("");
                setBusy("load");
                setSelected(null);

                const currentDay =
                    dateKey(
                        new Date()
                    );

                setSummaryDate(
                    currentDay >= week
                    && currentDay <= shiftDate(
                        week,
                        6
                    )
                        ? currentDay
                        : week
                );

                try {

                    const [
                        saved,
                        body,
                        snackData
                    ] =
                        await Promise.all([
                            demo
                                ? previewWeeks
                                    .current
                                    .get(week)
                                : loadWeek(week),

                            demo
                                ? null
                                : loadPlannerProfile()
                                    .catch(
                                        () => ({
                                            failed: true
                                        })
                                    ),

                            demo
                                ? []
                                : loadSnackCatalog()
                                    .catch(
                                        () => null
                                    )
                        ]);

                    if (
                        !active
                        || operation.current
                    ) {
                        return;
                    }

                    setSnacks(
                        Array.isArray(
                            snackData
                        )
                            ? snackData
                            : []
                    );

                    setSnackError(
                        !Array.isArray(
                            snackData
                        )
                    );

                    const effectiveProfile =
                        body?.failed
                            ? null
                            : body;

                    setProfile(
                        effectiveProfile
                    );

                    setProfileError(
                        body?.failed
                            ? "기록된 체중과 영양 목표를 불러오지 못했어요. 직접 입력하거나 다시 불러와 주세요."
                            : ""
                    );

                    const initial =
                        defaults(
                            week
                        );

                    /*
                     * 기존:
                     *
                     * proteinPerKg: 0.8
                     *
                     * 고정값을 사용했다.
                     *
                     * 이제 Diet에 확정된 목표가 있으면
                     * targetProtein / weightKg 값을 사용한다.
                     */
                    if (
                        effectiveProfile?.weightKg
                    ) {

                        initial.nutritionGoal =
                            createNutritionGoalFromProfile(
                                effectiveProfile,
                                1.4
                            );
                    }

                    let restored =
                        saved?.preferences
                            ? structuredClone(
                                saved.preferences
                            )
                            : initial;

                    /*
                     * 기존 저장 계획이 있더라도
                     * 현재 Diet 목표가 변경됐으면
                     * 단백질/칼로리 기준을 최신 값으로 맞춘다.
                     */
                    if (
                        restored.nutritionGoal
                        && effectiveProfile
                    ) {

                        restored =
                            {
                                ...restored,

                                nutritionGoal:
                                    syncNutritionGoalWithProfile(
                                        restored.nutritionGoal,
                                        effectiveProfile,
                                        1.4
                                    )
                            };
                    }

                    restored.exerciseWindows =
                        restored.exerciseDays.map(
                            day =>
                                (
                                    restored
                                        .exerciseWindows
                                    || []
                                ).find(
                                    window =>
                                        window.day
                                        === day
                                )
                                ||
                                defaultExerciseWindow(
                                    restored,
                                    day
                                )
                        );

                    setPreferences(
                        restored
                    );

                    /*
                     * Diet에서 칼로리 목표가 내려오면
                     * Planner 자체 자동 계산을 사용하지 않는다.
                     */
                    setAutoCalories(
                        !effectiveProfile
                            ?.targetCalories
                        &&
                        !saved
                            ?.preferences
                            ?.nutritionGoal
                    );

                    setActivity(
                        1.4
                    );

                    setEvents(
                        saved?.events
                        || []
                    );

                    setRevision(
                        saved?.revision
                        || 0
                    );

                    setDirty(false);
                    setNotices([]);

                    setStatus(
                        saved
                            ? "저장한 일정을 불러왔어요."
                            : (
                                effectiveProfile?.targetProtein
                                    ? "식단 관리의 영양 목표를 불러왔어요. 생활 리듬에 맞는 한 주를 만들어 보세요."
                                    : "생활 리듬에 맞는 한 주를 만들어 보세요."
                            )
                    );

                    setLoaded(true);

                } catch (err) {

                    if (active) {

                        setError(
                            err.response
                                ?.data
                                ?.message
                            ||
                            "저장된 일정을 불러오지 못했어요. 다시 불러와 주세요."
                        );
                    }

                } finally {

                    if (
                        active
                        && !operation.current
                    ) {
                        setBusy("");
                    }
                }
            }

            load();

            return () => {

                active =
                    false;
            };

        },
        [
            week,
            demo,
            reload
        ]
    );


    useEffect(
        () => {

            if (!dirty) {
                return;
            }

            const warn =
                event => {

                    event.preventDefault();
                    event.returnValue = "";
                };

            window.addEventListener(
                "beforeunload",
                warn
            );

            return () =>
                window.removeEventListener(
                    "beforeunload",
                    warn
                );

        },
        [dirty]
    );


    // =========================================================
    // State helper
    // =========================================================

    const update =
        (
            key,
            value
        ) => {

            setPreferences(
                current => ({
                    ...current,
                    [key]: value
                })
            );

            setDirty(true);
            setStatus("");
        };


    const edit =
        (
            id,
            change
        ) => {

            setEvents(
                items =>
                    items.map(
                        item =>
                            item.id === id
                                ? updatePlannerEvent(
                                    item,
                                    change
                                )
                                : item
                    )
            );

            setDirty(true);
            setStatus("");
        };


    function toggleExerciseDay(
        day,
        checked
    ) {

        setPreferences(
            current => ({
                ...current,

                exerciseDays:
                    checked
                        ? [
                            ...current.exerciseDays,
                            day
                        ]
                        : current
                            .exerciseDays
                            .filter(
                                value =>
                                    value !== day
                            ),

                exerciseWindows:
                    checked
                        ? [
                            ...(
                                current.exerciseWindows
                                || []
                            ).filter(
                                window =>
                                    window.day
                                    !== day
                            ),

                            defaultExerciseWindow(
                                current,
                                day
                            )
                        ]
                        : (
                            current.exerciseWindows
                            || []
                        ).filter(
                            window =>
                                window.day
                                !== day
                        )
            })
        );

        setDirty(true);
        setStatus("");
    }


    function updateExerciseWindow(
        day,
        key,
        value
    ) {

        const windows =
            preferences.exerciseWindows
            || [];

        const current =
            windows.find(
                window =>
                    window.day === day
            )
            ||
            defaultExerciseWindow(
                preferences,
                day
            );

        update(
            "exerciseWindows",
            [
                ...windows.filter(
                    window =>
                        window.day !== day
                ),

                {
                    ...current,
                    [key]: value
                }
            ]
        );
    }


    function changeWeek(
        offset
    ) {

        if (
            dirty
            && !window.confirm(
                "저장하지 않은 변경을 버리고 다른 주로 이동할까요?"
            )
        ) {
            return;
        }

        setWeek(
            value =>
                shiftDate(
                    value,
                    offset
                )
        );
    }


    // =========================================================
    // Generate
    // =========================================================

    async function generate(
        event
    ) {

        event.preventDefault();

        if (
            operation.current
            || busy
            || !loaded
        ) {
            return;
        }

        const invalid =
            validatePlan(
                preferences,
                []
            );

        if (invalid) {

            setError(
                invalid
            );

            return;
        }

        operation.current =
            true;

        if (
            events.length
            && !window.confirm(
                "현재 주의 식사·간식·운동과 완료 체크를 새 초안으로 교체할까요? 저장된 일정은 확정 저장 전까지 유지됩니다."
            )
        ) {

            operation.current =
                false;

            return;
        }

        setBusy(
            "generate"
        );

        setError("");

        setStatus(
            "새 계획을 생성하고 있어요. 완료 전까지 기존 계획이 표시됩니다."
        );

        setNotices([]);
        setSelected(null);

        try {

            const result =
                demo
                    ? exampleWeek(
                        preferences
                    )
                    : await generateWeek(
                        preferences
                    );

            const conflict =
                validatePlan(
                    preferences,
                    result.events
                );

            if (conflict) {

                throw new Error(
                    conflict
                );
            }

            setEvents(
                result.events
            );

            setNotices(
                result.notices
                || []
            );

            setDirty(true);
            setFormOpen(false);

            const meals =
                result.events.filter(
                    item =>
                        item.kind
                        === "MEAL"
                );

            const composed =
                meals.filter(
                    item =>
                        item
                            .foodEvidence
                            ?.components
                            ?.length
                ).length;

            setStatus(
                demo
                    ? "샘플 계획이에요. 일정을 눌러 수정해 보세요."
                    :
                    `식사 ${meals.length}끼 중 밥·반찬·채소 조합 ${composed}끼, 레시피 ${meals.length - composed}끼로 만들었어요. 새 초안으로 교체했으며 완료 체크는 초기화됐어요. 확정 저장하면 반영됩니다.`
            );

        } catch (err) {

            setStatus(
                events.length
                    ? "재생성에 실패해 기존 계획을 유지했습니다."
                    : ""
            );

            setError(
                err.response
                    ?.data
                    ?.message
                ||
                err.message
                ||
                "계획을 생성하지 못했어요."
            );

        } finally {

            operation.current =
                false;

            setBusy("");
        }
    }


    // =========================================================
    // Save
    // =========================================================

    async function save() {

        if (
            operation.current
        ) {
            return;
        }

        const invalid =
            validatePlan(
                preferences,
                events
            );

        if (invalid) {

            setError(
                invalid
            );

            return;
        }

        operation.current =
            true;

        setBusy("save");
        setError("");

        try {

            const payload = {
                revision,
                preferences,
                events
            };

            const saved =
                demo
                    ? {
                        ...payload,
                        revision:
                            revision + 1
                    }
                    : await saveWeek(
                        payload
                    );

            if (demo) {

                previewWeeks
                    .current
                    .set(
                        week,
                        structuredClone(
                            saved
                        )
                    );
            }

            /*
             * 서버가 Diet 목표를 다시 적용해서 반환하므로
             * 저장 성공 후 Preferences도 서버 응답으로 맞춘다.
             */
            if (
                saved.preferences
            ) {

                setPreferences(
                    saved.preferences
                );
            }

            setRevision(
                saved.revision
            );

            setDirty(false);

            setStatus(
                demo
                    ? "미리보기 안에서 저장했어요. 새로고침하면 초기화됩니다."
                    : "식단·운동 관리 페이지에도 함께 저장했어요."
            );

        } catch (err) {

            setError(
                err.response
                    ?.data
                    ?.message
                ||
                "저장하지 못했어요. 변경 내용은 화면에 남아 있습니다."
            );

        } finally {

            operation.current =
                false;

            setBusy("");
        }
    }


    // =========================================================
    // Derived values
    // =========================================================

    const chosen =
        events.find(
            event =>
                event.id === selected
        );

    const today =
        dateKey(
            new Date()
        );

    const todayEvents =
        events.filter(
            event =>
                event.start
                    .slice(0, 10)
                === summaryDate
        );

    const todayPlan =
        dayNutrition(
            todayEvents
        );

    const targetStatus =
        calorieTargetStatus(
            preferences,
            todayEvents
        );

    const todayDone =
        dayNutrition(
            todayEvents.filter(
                event =>
                    event.completed
            )
        );

    const goal =
        preferences.nutritionGoal;

    const goalProtein =
        goal
            ? roundOneDecimal(
                goal.weightKg
                * goal.proteinPerKg
            )
            : null;

    const snackOffer =
        snackRecommendations(
            preferences,
            summaryDate,
            events,
            snacks
        );

    const hasSnack =
        todayEvents.some(
            item =>
                item.kind === "SNACK"
        );


    // =========================================================
    // Snack
    // =========================================================

    function addSnack(
        candidate
    ) {

        if (
            !snackOffer?.start
            || busy
            || todayEvents.filter(
                item =>
                    item.kind
                    === "SNACK"
            ).length >= 2
        ) {
            return;
        }

        const event = {
            id:
                crypto.randomUUID(),

            kind:
                "SNACK",

            title:
            candidate.title,

            details:
            candidate.note,

            start:
            snackOffer.start,

            end:
            snackOffer.end,

            intensity:
                "",

            completed:
                false,

            foodEvidence:
                structuredClone(
                    candidate.foodEvidence
                )
        };

        const invalid =
            validatePlan(
                preferences,
                [
                    ...events,
                    event
                ]
            );

        if (invalid) {

            setError(
                invalid
            );

            return;
        }

        setEvents(
            items =>
                items.filter(
                    item =>
                        item.kind === "SNACK"
                        &&
                        item.start
                            .slice(0, 10)
                        === summaryDate
                ).length >= 2
                    ? items
                    : [
                        ...items,
                        event
                    ].sort(
                        (
                            a,
                            b
                        ) =>
                            a.start.localeCompare(
                                b.start
                            )
                    )
        );

        setSelected(
            event.id
        );

        setDirty(true);

        setStatus(
            "선택한 간식을 계획에 추가했어요. 확정하고 저장하면 유지됩니다."
        );
    }


    // =========================================================
    // Nutrition goal
    // =========================================================

    const estimatedCalories =
        estimateCalories(
            goal?.weightKg,
            profile,
            activity
        );


    const changeGoal =
        (
            key,
            value
        ) => {

            if (!goal) {
                return;
            }

            /*
             * Diet 목표가 있는 경우,
             * 단백질과 칼로리는 Diet가 authoritative source다.
             *
             * 화면에서 수정한 뒤 서버가 다시 덮어쓰는
             * 모순을 막는다.
             */
            if (
                key === "proteinPerKg"
                && hasDietProteinGoal
            ) {
                return;
            }

            if (
                key === "calories"
                && hasDietCalorieGoal
            ) {
                return;
            }

            let next = {
                ...goal,

                [key]:
                value,

                confirmed:
                    key === "confirmed"
                        ? value
                        : false
            };

            /*
             * 기준 체중을 직접 변경해도
             * Diet의 targetProtein 자체는 변하지 않는다.
             *
             * 그래서 새로운 체중 기준으로
             * proteinPerKg만 다시 계산한다.
             */
            if (
                key === "weightKg"
                && hasDietProteinGoal
                && Number(value) > 0
            ) {

                next.proteinPerKg =
                    Number(
                        profile.targetProtein
                    ) / Number(value);
            }

            /*
             * Diet 칼로리 목표가 없는 경우에만
             * Planner의 자동 추정 열량을 사용한다.
             */
            if (
                key === "weightKg"
                && autoCalories
                && !hasDietCalorieGoal
            ) {

                next.calories =
                    estimateCalories(
                        value,
                        profile,
                        activity
                    )
                    || 0;
            }

            if (
                hasDietCalorieGoal
            ) {

                next.calories =
                    Number(
                        profile.targetCalories
                    );
            }

            update(
                "nutritionGoal",
                next
            );
        };


    const count =
        events.filter(
            event =>
                event.completed
        ).length;


    // =========================================================
    // Render
    // =========================================================

    return (
        <section
            className="weekly-planner"
            aria-labelledby="planner-title"
            aria-busy={!!busy}
        >

            {/* ================================================= */}
            {/* Header */}
            {/* ================================================= */}

            <header className="planner-heading">

                <div>
                    <span className="planner-eyebrow">
                        A WEEK FOR YOU
                    </span>

                    <h2 id="planner-title">
                        내 일상에 맞춘 AI 플래너
                    </h2>

                    <p>
                        먹는 시간도, 움직이는 시간도.
                        나의 생활 리듬에 맞게.
                    </p>
                </div>

                <button
                    type="button"
                    className="planner-primary"
                    disabled={
                        !!busy
                        || !loaded
                    }
                    onClick={
                        () =>
                            setFormOpen(
                                !formOpen
                            )
                    }
                    aria-expanded={
                        formOpen
                    }
                    aria-controls="planner-settings"
                >
                    {
                        formOpen
                            ? "입력 닫기"
                            : (
                                events.length
                                    ? "생활 정보 수정"
                                    : "나의 한 주 만들기"
                            )
                    }

                    {" "}

                    <span aria-hidden="true">
                        ↗
                    </span>
                </button>

            </header>


            {
                demo
                && (
                    <p className="planner-demo">
                        디자인 미리보기 · AI 호출과 DB 저장 없이
                        샘플 일정으로 체험합니다.
                    </p>
                )
            }


            {/* ================================================= */}
            {/* Nutrition summary */}
            {/* ================================================= */}

            <section
                className="planner-nutrition-today"
                aria-label="선택한 날짜의 영양 요약"
            >

                <header>
                    <strong>
                        {
                            summaryDate === today
                                ? "오늘의 영양 계획"
                                : "선택한 날짜의 영양 계획"
                        }
                    </strong>

                    <span>
                        {summaryDate} · 표시된 식사량 기준
                    </span>
                </header>


                <div className="planner-nutrition-cards">

                    <div>
                        <span>
                            계획 열량
                        </span>

                        <b>
                            {
                                todayPlan.available
                                    ? Math.round(
                                        todayPlan.calories
                                    ).toLocaleString()
                                    : "—"
                            }

                            <small>
                                {" "}kcal
                            </small>
                        </b>

                        <em>
                            목표{" "}
                            {
                                goal?.calories
                                || "미설정"
                            }
                        </em>
                    </div>


                    <div>
                        <span>
                            계획 단백질
                        </span>

                        <b>
                            {
                                todayPlan.available
                                    ? todayPlan
                                        .protein
                                        .toFixed(1)
                                    : "—"
                            }

                            <small>
                                {" "}g
                            </small>
                        </b>

                        <em>
                            목표{" "}
                            {
                                goalProtein === null
                                    ? "미설정"
                                    : `${goalProtein} g`
                            }
                        </em>
                    </div>


                    <div>
                        <span>
                            {
                                hasSnack
                                    ? "완료한 식사·간식"
                                    : "완료 체크한 식사"
                            }
                        </span>

                        <b>
                            {todayDone.count}

                            <small>
                                {" "}/ {todayPlan.count}
                                {
                                    hasSnack
                                        ? "건"
                                        : "끼"
                                }
                            </small>
                        </b>

                        <em>
                            {
                                todayDone.available
                                    ? `${todayDone.protein.toFixed(1)} g 단백질 · ${Math.round(todayDone.calories)} kcal`
                                    : (
                                        todayDone.count
                                            ? "완료 반영됨 · 영양정보 계산 불가"
                                            : "아직 완료한 식사가 없어요"
                                    )
                            }
                        </em>

                        {
                            todayDone.partial
                            && (
                                <em>
                                    완료 {todayDone.count}끼 중{" "}
                                    {todayDone.available}끼의
                                    영양정보만 합산
                                </em>
                            )
                        }
                    </div>

                </div>


                {
                    todayPlan.ratios
                    && (
                        <>
                            <div
                                className="planner-ratio-bar"
                                aria-label="탄단지 열량 비율"
                            >
                                {
                                    todayPlan
                                        .ratios
                                        .map(
                                            (
                                                ratio,
                                                index
                                            ) => (
                                                <span
                                                    key={index}
                                                    style={{
                                                        flex:
                                                        ratio
                                                    }}
                                                />
                                            )
                                        )
                                }
                            </div>

                            <p>
                                탄수화물 {todayPlan.ratios[0]}%
                                {" · "}
                                단백질 {todayPlan.ratios[1]}%
                                {" · "}
                                지방 {todayPlan.ratios[2]}%
                            </p>
                        </>
                    )
                }


                <p className="planner-help">
                    {
                        todayPlan.partial
                            ? "일부 식사의 중량·영양정보가 없어 부분 합계입니다. "
                            : ""
                    }

                    날짜를 누르거나 체크하면 해당 날짜의 합계를 보여줍니다.
                    체크 변경은 확정 저장해야 유지됩니다.
                    완료 체크는 실제 섭취량 기록과 다릅니다.
                    비율은 탄수화물·단백질 4,
                    지방 9 kcal/g로 계산합니다.
                </p>

            </section>


            {
                targetStatus
                && (
                    <p
                        role="status"
                        className={
                            `planner-target-status planner-target-status--${targetStatus.state}`
                        }
                    >
                        {targetStatus.text}
                        {" · "}
                        계획량 기준이며 실제 섭취량은 아닙니다.
                    </p>
                )
            }


            {
                goal?.confirmed
                && (
                    <div
                        className="planner-week-targets"
                        aria-label="요일별 목표 열량 충족 상태"
                    >
                        {
                            DAYS.map(
                                (
                                    day,
                                    index
                                ) => {

                                    const date =
                                        shiftDate(
                                            preferences.weekStart,
                                            index
                                        );

                                    const state =
                                        calorieTargetStatus(
                                            preferences,
                                            events.filter(
                                                event =>
                                                    event.start
                                                        .slice(0, 10)
                                                    === date
                                            )
                                        );

                                    return (
                                        <button
                                            key={date}
                                            type="button"
                                            onClick={
                                                () =>
                                                    setSummaryDate(
                                                        date
                                                    )
                                            }
                                            className={
                                                `planner-target-status--${state.state}`
                                            }
                                            aria-pressed={
                                                summaryDate
                                                === date
                                            }
                                        >
                                            {day}
                                            {" · "}
                                            {
                                                {
                                                    macro_unbalanced:
                                                        "탄단지 조정",

                                                    unbalanced:
                                                        "끼니 불균형",

                                                    within:
                                                        "충족",

                                                    low:
                                                        "부족",

                                                    high:
                                                        "초과",

                                                    missing:
                                                        "식사 누락",

                                                    unknown:
                                                        "확인 불가"
                                                }[
                                                    state.state
                                                    ]
                                            }
                                        </button>
                                    );
                                }
                            )
                        }
                    </div>
                )
            }


            {
                goal?.confirmed
                && (
                    <p className="planner-help">
                        생성 기준: 하루 탄수화물 45~65%
                        {" · "}
                        지방 20~35%
                        {" · "}
                        설정된 단백질 목표 기준.
                        비율은 탄단지 환산 열량 기준이며
                        일반 성인용 참고 범위입니다.
                        {" "}

                        <a
                            href="https://www.ncbi.nlm.nih.gov/books/NBK208874/"
                            target="_blank"
                            rel="noreferrer"
                        >
                            비율 참고 기준
                        </a>
                    </p>
                )
            }


            {/* ================================================= */}
            {/* Snack recommendation */}
            {/* ================================================= */}

            {
                snackOffer
                && (
                    <section
                        ref={snackPanel}
                        className="planner-snack-offer"
                        aria-label="선택 가능한 단백질 간식"
                    >

                        <header>
                            <strong>
                                가볍게 보충하고 싶다면
                            </strong>

                            <span>
                                계획상 열량{" "}
                                {snackOffer.calorieGap}
                                {" "}kcal · 단백질{" "}
                                {snackOffer.gap.toFixed(1)}
                                g 부족
                            </span>
                        </header>

                        <p>
                            현재 계획과 설정한 목표의 차이예요.
                            필요할 때 하나를 선택하세요.
                            선택 전에는 일정과 영양 합계에 포함되지 않습니다.
                        </p>

                        {
                            snackError
                                ? (
                                    <p>
                                        간식 자료를 불러오지 못했어요.
                                        화면을 새로고침해 주세요.
                                    </p>
                                )
                                : (
                                    <>

                                        {
                                            snackOffer.reason
                                            && (
                                                <p>
                                                    {snackOffer.reason}
                                                </p>
                                            )
                                        }


                                        <div className="planner-snack-options">

                                            {
                                                snackOffer
                                                    .candidates
                                                    .map(
                                                        item => (
                                                            <article key={item.id}>

                                                                <small>
                                                                    {
                                                                        {
                                                                            shake:
                                                                                "단백질 쉐이크",

                                                                            chicken:
                                                                                "닭가슴살",

                                                                            egg:
                                                                                "삶은 계란"
                                                                        }[
                                                                            item.category
                                                                            ]
                                                                    }
                                                                </small>

                                                                <strong>
                                                                    {item.title}
                                                                </strong>

                                                                <span>
                                                                    {item.foodEvidence.servingWeight}g
                                                                    {" · "}
                                                                    단백질{" "}
                                                                    {
                                                                        Number(
                                                                            item
                                                                                .foodEvidence
                                                                                .nutrition
                                                                                .INFO_PRO
                                                                        ).toFixed(1)
                                                                    }
                                                                    g ·{" "}
                                                                    {
                                                                        formatNutrient(
                                                                            item
                                                                                .foodEvidence
                                                                                .nutrition
                                                                                .INFO_ENG
                                                                        )
                                                                    }
                                                                    {" "}kcal
                                                                </span>

                                                                <p>
                                                                    {item.note}
                                                                </p>

                                                                <button
                                                                    type="button"
                                                                    disabled={!!busy}
                                                                    onClick={
                                                                        () =>
                                                                            addSnack(
                                                                                item
                                                                            )
                                                                    }
                                                                    aria-label={
                                                                        `${item.title} 간식으로 추가`
                                                                    }
                                                                >
                                                                    {
                                                                        snackOffer.start
                                                                            ?.slice(
                                                                                11
                                                                            )
                                                                    }
                                                                    에 추가
                                                                </button>

                                                            </article>
                                                        )
                                                    )
                                            }

                                        </div>


                                        {
                                            !!snackOffer
                                                .candidates
                                                .length
                                            && (
                                                <p>
                                                    제품 예시이며 특정 브랜드를
                                                    권장하지 않습니다.
                                                    선호·성분과 실제 먹는 양을
                                                    확인해 주세요.
                                                </p>
                                            )
                                        }

                                    </>
                                )
                        }

                    </section>
                )
            }


            {/* ================================================= */}
            {/* Week navigation */}
            {/* ================================================= */}

            <div className="planner-week-nav">

                <div>

                    <button
                        type="button"
                        aria-label="이전 주"
                        disabled={!!busy}
                        onClick={
                            () =>
                                changeWeek(
                                    -7
                                )
                        }
                    >
                        ‹
                    </button>

                    <strong>
                        {
                            week.replaceAll(
                                "-",
                                "."
                            )
                        }
                        {" — "}
                        {
                            shiftDate(
                                week,
                                6
                            )
                                .slice(5)
                                .replace(
                                    "-",
                                    "."
                                )
                        }
                    </strong>

                    <button
                        type="button"
                        aria-label="다음 주"
                        disabled={!!busy}
                        onClick={
                            () =>
                                changeWeek(
                                    7
                                )
                        }
                    >
                        ›
                    </button>

                </div>

                <span>
                    {
                        events.length
                            ? `${count}/${events.length} 완료 · ${dirty ? "저장 전 변경" : "저장됨"}`
                            : "주간 일정"
                    }
                </span>

            </div>


            {
                error
                && (
                    <div
                        className="planner-error"
                        role="alert"
                    >
                        {error}
                        {" "}

                        <button
                            type="button"
                            disabled={!!busy}
                            onClick={
                                () => {

                                    if (
                                        !dirty
                                        || window.confirm(
                                            "변경 내용을 버리고 저장된 일정을 불러올까요?"
                                        )
                                    ) {

                                        setReload(
                                            value =>
                                                value + 1
                                        );
                                    }
                                }
                            }
                        >
                            다시 불러오기
                        </button>

                    </div>
                )
            }


            <p
                className="planner-status"
                role="status"
            >
                {
                    busy === "generate"
                        ? "선호와 일정을 살펴보고 한 주를 구성하고 있어요…"
                        : (
                            busy === "load"
                                ? "주간 일정 불러오는 중…"
                                : (
                                    busy === "save"
                                        ? "저장하는 중…"
                                        : status
                                )
                        )
                }
            </p>


            {/* ================================================= */}
            {/* Planner settings */}
            {/* ================================================= */}

            {
                formOpen
                && (
                    <form
                        id="planner-settings"
                        onSubmit={generate}
                        className="planner-settings"
                    >

                        {/* 생활 리듬 */}

                        <fieldset
                            disabled={
                                !!busy
                                || !loaded
                            }
                        >
                            <legend>
                                01 · 생활 리듬
                            </legend>

                            <div className="planner-form-grid">

                                {
                                    [
                                        [
                                            "wakeTime",
                                            "기상"
                                        ],
                                        [
                                            "sleepTime",
                                            "취침"
                                        ],
                                        [
                                            "breakfastTime",
                                            "아침 식사"
                                        ],
                                        [
                                            "lunchTime",
                                            "점심 식사"
                                        ],
                                        [
                                            "dinnerTime",
                                            "저녁 식사"
                                        ]
                                    ].map(
                                        (
                                            [
                                                key,
                                                label
                                            ]
                                        ) => (
                                            <label key={key}>
                                                {label}

                                                <input
                                                    type="time"
                                                    required
                                                    value={
                                                        preferences[
                                                            key
                                                            ]
                                                    }
                                                    onChange={
                                                        event =>
                                                            update(
                                                                key,
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                    }
                                                />
                                            </label>
                                        )
                                    )
                                }

                            </div>

                            <p className="planner-help">
                                현재는 같은 날 기상·취침하는 일정을 지원해요.
                                시간은 한국 시간 기준입니다.
                            </p>

                        </fieldset>


                        {/* 운동 / 영양 */}

                        <fieldset disabled={!!busy}>

                            <legend>
                                02 · 운동과 식사 선호
                            </legend>


                            <div className="planner-goal-settings">

                                <label>
                                    <input
                                        type="checkbox"
                                        checked={!!goal}
                                        onChange={
                                            event => {

                                                if (
                                                    !event
                                                        .target
                                                        .checked
                                                ) {

                                                    update(
                                                        "nutritionGoal",
                                                        null
                                                    );

                                                    return;
                                                }

                                                const next =
                                                    createNutritionGoalFromProfile(
                                                        profile,
                                                        activity
                                                    )
                                                    || {
                                                        weightKg:
                                                            profile?.weightKg
                                                            || 0,

                                                        proteinPerKg:
                                                            0.8,

                                                        calories:
                                                            estimateCalories(
                                                                profile?.weightKg,
                                                                profile,
                                                                activity
                                                            )
                                                            || 0,

                                                        confirmed:
                                                            false
                                                    };

                                                update(
                                                    "nutritionGoal",
                                                    next
                                                );
                                            }
                                        }
                                    />

                                    열량·단백질 목표에 맞춰 추천받기
                                </label>


                                {
                                    goal
                                    && (
                                        <>

                                            {
                                                profileError
                                                && (
                                                    <p
                                                        role="status"
                                                        className="planner-help"
                                                    >
                                                        {profileError}
                                                    </p>
                                                )
                                            }


                                            {
                                                hasDietGoal
                                                    ? (
                                                        <p className="planner-help">
                                                            식단 관리에서 설정된
                                                            Protein First 영양 목표를
                                                            Planner에서도 동일하게 사용합니다.
                                                            {
                                                                profile
                                                                    ?.nutritionPolicyVersion
                                                                != null
                                                                    ? ` · 정책 버전 ${profile.nutritionPolicyVersion}`
                                                                    : ""
                                                            }
                                                        </p>
                                                    )
                                                    : (
                                                        <p className="planner-help">
                                                            식단 관리 목표가 아직 없어서
                                                            Planner에서 입력한 일반 목표를
                                                            사용합니다.
                                                        </p>
                                                    )
                                            }


                                            <p className="planner-help">
                                                {
                                                    profile?.weightKg
                                                        ? `최근 기록 ${profile.weightKg} kg · ${profile.weightRecordedAt?.slice(0, 10) || ""}`
                                                        : "저장된 체중이 없으면 직접 입력해 주세요."
                                                }

                                                {" · "}

                                                여기서 수정한 체중은
                                                식단 계산에만 사용하며
                                                체중 기록을 바꾸지 않습니다.
                                            </p>


                                            {
                                                profile?.targetWeight
                                                && (
                                                    <p className="planner-help">
                                                        식단 관리 목표 체중{" "}
                                                        <strong>
                                                            {
                                                                profile
                                                                    .targetWeight
                                                            } kg
                                                        </strong>
                                                    </p>
                                                )
                                            }


                                            {
                                                profile?.weightKg
                                                && (
                                                    <button
                                                        type="button"
                                                        className="planner-secondary"
                                                        onClick={
                                                            () =>
                                                                changeGoal(
                                                                    "weightKg",
                                                                    profile
                                                                        .weightKg
                                                                )
                                                        }
                                                    >
                                                        최근 기록 체중 적용
                                                    </button>
                                                )
                                            }


                                            <div className="planner-form-grid">

                                                <label>
                                                    현재 체중 (kg)

                                                    <input
                                                        type="number"
                                                        min="20"
                                                        max="350"
                                                        step="0.1"
                                                        required
                                                        value={
                                                            goal.weightKg
                                                            || ""
                                                        }
                                                        onChange={
                                                            event =>
                                                                changeGoal(
                                                                    "weightKg",
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                )
                                                        }
                                                    />
                                                </label>


                                                <label>
                                                    단백질 기준 (g/kg/일)

                                                    <input
                                                        type="number"
                                                        min="0.1"
                                                        max="3"
                                                        step="0.01"
                                                        required
                                                        disabled={
                                                            hasDietProteinGoal
                                                        }
                                                        value={
                                                            Number(
                                                                goal.proteinPerKg
                                                            ).toFixed(2)
                                                        }
                                                        onChange={
                                                            event =>
                                                                changeGoal(
                                                                    "proteinPerKg",
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                )
                                                        }
                                                    />
                                                </label>


                                                <label>
                                                    하루 목표 열량 (kcal)

                                                    <input
                                                        type="number"
                                                        min="1000"
                                                        max="5000"
                                                        step="1"
                                                        required
                                                        disabled={
                                                            hasDietCalorieGoal
                                                        }
                                                        value={
                                                            goal.calories
                                                            || ""
                                                        }
                                                        onChange={
                                                            event =>
                                                                changeGoal(
                                                                    "calories",
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    )
                                                                )
                                                        }
                                                    />
                                                </label>


                                                <label>
                                                    활동 수준

                                                    <select
                                                        disabled={
                                                            hasDietCalorieGoal
                                                        }
                                                        value={activity}
                                                        onChange={
                                                            event => {

                                                                const value =
                                                                    Number(
                                                                        event
                                                                            .target
                                                                            .value
                                                                    );

                                                                setActivity(
                                                                    value
                                                                );

                                                                if (
                                                                    autoCalories
                                                                    &&
                                                                    !hasDietCalorieGoal
                                                                ) {

                                                                    update(
                                                                        "nutritionGoal",
                                                                        {
                                                                            ...goal,

                                                                            calories:
                                                                                estimateCalories(
                                                                                    goal.weightKg,
                                                                                    profile,
                                                                                    value
                                                                                )
                                                                                || 0,

                                                                            confirmed:
                                                                                false
                                                                        }
                                                                    );
                                                                }
                                                            }
                                                        }
                                                    >
                                                        <option value={1.4}>
                                                            낮음 · 1.4배
                                                        </option>

                                                        <option value={1.6}>
                                                            보통 · 1.6배
                                                        </option>

                                                        <option value={1.8}>
                                                            높음 · 1.8배
                                                        </option>
                                                    </select>
                                                </label>

                                            </div>


                                            {
                                                hasDietProteinGoal
                                                && (
                                                    <p className="planner-help">
                                                        식단 관리 기준 단백질 목표{" "}
                                                        <strong>
                                                            {
                                                                Number(
                                                                    profile
                                                                        .targetProtein
                                                                ).toFixed(1)
                                                            } g/일
                                                        </strong>
                                                        입니다.
                                                        Planner에서는 이 값을
                                                        직접 변경하지 않습니다.
                                                    </p>
                                                )
                                            }


                                            {
                                                hasDietCalorieGoal
                                                && (
                                                    <p className="planner-help">
                                                        식단 관리 기준 하루 열량{" "}
                                                        <strong>
                                                            {
                                                                Number(
                                                                    profile
                                                                        .targetCalories
                                                                ).toLocaleString()
                                                            } kcal
                                                        </strong>
                                                        를 사용합니다.
                                                    </p>
                                                )
                                            }


                                            {
                                                !hasDietCalorieGoal
                                                && (
                                                    <>
                                                        <p className="planner-help">
                                                            {
                                                                estimatedCalories
                                                                    ? `체중 유지 추정 열량 ${estimatedCalories.toLocaleString()} kcal/일 · 저장된 키 ${profile?.heightCm ?? "—"}cm, 만 ${profile?.age ?? "—"}세, 성별과 활동 수준으로 계산합니다.`
                                                                    : "자동 계산에는 저장된 키·생년월일·계산 가능한 성별 정보가 필요합니다(19~78세). 정보가 없거나 적용 범위 밖이면 열량을 직접 입력해 주세요."
                                                            }
                                                        </p>

                                                        {
                                                            estimatedCalories
                                                            && (
                                                                <button
                                                                    type="button"
                                                                    className="planner-secondary"
                                                                    onClick={
                                                                        () => {

                                                                            setAutoCalories(
                                                                                true
                                                                            );

                                                                            update(
                                                                                "nutritionGoal",
                                                                                {
                                                                                    ...goal,

                                                                                    calories:
                                                                                    estimatedCalories,

                                                                                    confirmed:
                                                                                        false
                                                                                }
                                                                            );
                                                                        }
                                                                    }
                                                                >
                                                                    {
                                                                        autoCalories
                                                                            ? "추정 열량 다시 적용"
                                                                            : "직접 입력 대신 추정 열량 적용"
                                                                    }
                                                                </button>
                                                            )
                                                        }
                                                    </>
                                                )
                                            }


                                            <p className="planner-help">
                                                현재 Planner 단백질 목표{" "}
                                                <strong>
                                                    {
                                                        goalProtein
                                                        ?? "—"
                                                    } g/일
                                                </strong>
                                                .

                                                {
                                                    hasDietProteinGoal
                                                        ? " 식단 관리의 Protein First 목표와 동일한 값입니다."
                                                        : " Diet 목표가 없을 때만 Planner 입력값을 사용합니다."
                                                }
                                            </p>


                                            <label className="planner-goal-confirm">

                                                <input
                                                    type="checkbox"
                                                    required
                                                    checked={
                                                        goal.confirmed
                                                    }
                                                    onChange={
                                                        event =>
                                                            changeGoal(
                                                                "confirmed",
                                                                event
                                                                    .target
                                                                    .checked
                                                            )
                                                    }
                                                />

                                                성인이며 임신·수유,
                                                신장질환 등 별도 영양 처방이
                                                필요한 상태가 아니고
                                                입력한 목표를 확인했습니다.

                                            </label>

                                        </>
                                    )
                                }

                            </div>


                            <div className="planner-form-grid">

                                <label>
                                    운동 경험

                                    <select
                                        value={
                                            preferences.experience
                                        }
                                        onChange={
                                            event =>
                                                update(
                                                    "experience",
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    >
                                        <option>
                                            초보
                                        </option>

                                        <option>
                                            가끔 운동
                                        </option>

                                        <option>
                                            규칙적으로 운동
                                        </option>
                                    </select>
                                </label>


                                <label>
                                    희망 강도

                                    <select
                                        value={
                                            preferences.intensity
                                        }
                                        onChange={
                                            event =>
                                                update(
                                                    "intensity",
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    >
                                        <option>
                                            가볍게
                                        </option>

                                        <option>
                                            보통
                                        </option>
                                    </select>
                                </label>

                            </div>


                            <div
                                className="planner-days"
                                aria-label="운동할 요일"
                            >

                                {
                                    DAYS.map(
                                        (
                                            day,
                                            index
                                        ) => (
                                            <label key={day}>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        preferences
                                                            .exerciseDays
                                                            .includes(
                                                                index
                                                            )
                                                    }
                                                    onChange={
                                                        event =>
                                                            toggleExerciseDay(
                                                                index,
                                                                event
                                                                    .target
                                                                    .checked
                                                            )
                                                    }
                                                />

                                                {day}
                                            </label>
                                        )
                                    )
                                }

                            </div>


                            <div className="planner-exercise-windows">

                                <h4>
                                    요일별 운동 가능 시간
                                </h4>

                                <p className="planner-help">
                                    시작부터 종료까지가 운동 시간이에요
                                    (10~90분).
                                    다른 일정과 겹치면 배치하지 않고 안내해요.
                                </p>

                                {
                                    [
                                        ...preferences.exerciseDays
                                    ]
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                a - b
                                        )
                                        .map(
                                            day => {

                                                const window =
                                                    (
                                                        preferences
                                                            .exerciseWindows
                                                        || []
                                                    ).find(
                                                        value =>
                                                            value.day
                                                            === day
                                                    )
                                                    ||
                                                    defaultExerciseWindow(
                                                        preferences,
                                                        day
                                                    );

                                                return (
                                                    <div
                                                        className="planner-exercise-window"
                                                        key={day}
                                                    >
                                                        <strong>
                                                            {DAYS[day]}요일
                                                        </strong>

                                                        <label>
                                                            시작

                                                            <input
                                                                aria-label={
                                                                    `${DAYS[day]}요일 운동 가능 시작`
                                                                }
                                                                type="time"
                                                                required
                                                                value={
                                                                    window?.start
                                                                    ||
                                                                    preferences
                                                                        .wakeTime
                                                                }
                                                                onChange={
                                                                    event =>
                                                                        updateExerciseWindow(
                                                                            day,
                                                                            "start",
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                }
                                                            />
                                                        </label>

                                                        <span>
                                                            —
                                                        </span>

                                                        <label>
                                                            종료

                                                            <input
                                                                aria-label={
                                                                    `${DAYS[day]}요일 운동 가능 종료`
                                                                }
                                                                type="time"
                                                                required
                                                                value={
                                                                    window?.end
                                                                    ||
                                                                    preferences
                                                                        .sleepTime
                                                                }
                                                                onChange={
                                                                    event =>
                                                                        updateExerciseWindow(
                                                                            day,
                                                                            "end",
                                                                            event
                                                                                .target
                                                                                .value
                                                                        )
                                                                }
                                                            />
                                                        </label>
                                                    </div>
                                                );
                                            }
                                        )
                                }


                                {
                                    !preferences
                                        .exerciseDays
                                        .length
                                    && (
                                        <p className="planner-help">
                                            운동할 요일을 선택하면
                                            가능한 시간을 지정할 수 있어요.
                                        </p>
                                    )
                                }

                            </div>


                            <div className="planner-form-grid">

                                <label>
                                    음식·운동 선호

                                    <textarea
                                        maxLength={1000}
                                        placeholder="예: 조리 시간 15분, 집에서 할 수 있는 운동"
                                        value={
                                            preferences.preferences
                                        }
                                        onChange={
                                            event =>
                                                update(
                                                    "preferences",
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    />
                                </label>


                                <label>
                                    음식 알레르기·피할 식품

                                    <textarea
                                        maxLength={1000}
                                        placeholder="해당 사항이 없으면 없음"
                                        value={
                                            preferences.allergies
                                        }
                                        onChange={
                                            event =>
                                                update(
                                                    "allergies",
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    />
                                </label>


                                <label>
                                    의료진의 제한·몸 상태

                                    <textarea
                                        maxLength={1000}
                                        placeholder="예: 무릎 부담을 피하도록 안내받음"
                                        value={
                                            preferences.limitations
                                        }
                                        onChange={
                                            event =>
                                                update(
                                                    "limitations",
                                                    event
                                                        .target
                                                        .value
                                                )
                                        }
                                    />
                                </label>

                            </div>

                        </fieldset>


                        {/* 고정 일정 */}

                        <fieldset disabled={!!busy}>

                            <legend>
                                03 · 이미 정해진 일정
                            </legend>

                            <p className="planner-help">
                                업무·수업 시간을 등록하세요.
                                그 시간에 식사나 간식이 가능하면 각각 체크해 주세요.
                                위에서 설정한 식사 시간을 우선 사용하며
                                운동은 겹치지 않게 배치합니다.
                            </p>


                            {
                                preferences.busySlots.map(
                                    (
                                        slot,
                                        index
                                    ) => (
                                        <div
                                            className="planner-busy-row"
                                            key={index}
                                        >

                                            <select
                                                aria-label={
                                                    `고정 일정 ${index + 1} 요일`
                                                }
                                                value={slot.day}
                                                onChange={
                                                    event =>
                                                        update(
                                                            "busySlots",
                                                            preferences
                                                                .busySlots
                                                                .map(
                                                                    (
                                                                        current,
                                                                        currentIndex
                                                                    ) =>
                                                                        currentIndex
                                                                        === index
                                                                            ? {
                                                                                ...current,

                                                                                day:
                                                                                    Number(
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                            }
                                                                            : current
                                                                )
                                                        )
                                                }
                                            >
                                                {
                                                    DAYS.map(
                                                        (
                                                            day,
                                                            dayIndex
                                                        ) => (
                                                            <option
                                                                value={dayIndex}
                                                                key={day}
                                                            >
                                                                {day}요일
                                                            </option>
                                                        )
                                                    )
                                                }
                                            </select>


                                            <input
                                                aria-label={
                                                    `고정 일정 ${index + 1} 제목`
                                                }
                                                required
                                                maxLength={60}
                                                value={
                                                    slot.title
                                                }
                                                onChange={
                                                    event =>
                                                        update(
                                                            "busySlots",
                                                            preferences
                                                                .busySlots
                                                                .map(
                                                                    (
                                                                        current,
                                                                        currentIndex
                                                                    ) =>
                                                                        currentIndex
                                                                        === index
                                                                            ? {
                                                                                ...current,

                                                                                title:
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            }
                                                                            : current
                                                                )
                                                        )
                                                }
                                            />


                                            {
                                                [
                                                    "start",
                                                    "end"
                                                ].map(
                                                    key => (
                                                        <input
                                                            key={key}
                                                            aria-label={
                                                                `고정 일정 ${index + 1} ${key === "start" ? "시작" : "종료"}`
                                                            }
                                                            type="time"
                                                            required
                                                            value={
                                                                slot[key]
                                                            }
                                                            onChange={
                                                                event =>
                                                                    update(
                                                                        "busySlots",
                                                                        preferences
                                                                            .busySlots
                                                                            .map(
                                                                                (
                                                                                    current,
                                                                                    currentIndex
                                                                                ) =>
                                                                                    currentIndex
                                                                                    === index
                                                                                        ? {
                                                                                            ...current,

                                                                                            [key]:
                                                                                            event
                                                                                                .target
                                                                                                .value
                                                                                        }
                                                                                        : current
                                                                            )
                                                                    )
                                                            }
                                                        />
                                                    )
                                                )
                                            }


                                            {
                                                [
                                                    [
                                                        "allowMeals",
                                                        "식사 가능"
                                                    ],
                                                    [
                                                        "allowSnacks",
                                                        "간식 가능"
                                                    ]
                                                ].map(
                                                    (
                                                        [
                                                            key,
                                                            label
                                                        ]
                                                    ) => (
                                                        <label
                                                            key={key}
                                                            className="planner-busy-allow"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    slot[key]
                                                                    === true
                                                                }
                                                                onChange={
                                                                    event =>
                                                                        update(
                                                                            "busySlots",
                                                                            preferences
                                                                                .busySlots
                                                                                .map(
                                                                                    (
                                                                                        current,
                                                                                        currentIndex
                                                                                    ) =>
                                                                                        currentIndex
                                                                                        === index
                                                                                            ? {
                                                                                                ...current,

                                                                                                [key]:
                                                                                                event
                                                                                                    .target
                                                                                                    .checked
                                                                                            }
                                                                                            : current
                                                                                )
                                                                        )
                                                                }
                                                            />

                                                            {label}
                                                        </label>
                                                    )
                                                )
                                            }


                                            <button
                                                type="button"
                                                aria-label={
                                                    `고정 일정 ${index + 1} 삭제`
                                                }
                                                onClick={
                                                    () =>
                                                        update(
                                                            "busySlots",
                                                            preferences
                                                                .busySlots
                                                                .filter(
                                                                    (
                                                                        _,
                                                                        currentIndex
                                                                    ) =>
                                                                        currentIndex
                                                                        !== index
                                                                )
                                                        )
                                                }
                                            >
                                                ×
                                            </button>

                                        </div>
                                    )
                                )
                            }


                            <button
                                type="button"
                                className="planner-secondary"
                                disabled={
                                    preferences
                                        .busySlots
                                        .length >= 35
                                }
                                onClick={
                                    () =>
                                        update(
                                            "busySlots",
                                            [
                                                ...preferences.busySlots,

                                                {
                                                    day:
                                                        0,

                                                    title:
                                                        "업무",

                                                    start:
                                                        "09:00",

                                                    end:
                                                        "17:00",

                                                    allowMeals:
                                                        false,

                                                    allowSnacks:
                                                        false
                                                }
                                            ]
                                        )
                                }
                            >
                                ＋ 고정 일정 추가
                            </button>

                        </fieldset>


                        <label className="planner-consent">

                            <input
                                type="checkbox"
                                required={!demo}
                                checked={
                                    preferences.aiConsent
                                }
                                onChange={
                                    event =>
                                        update(
                                            "aiConsent",
                                            event
                                                .target
                                                .checked
                                        )
                                }
                            />

                            입력한 음식 선호·알레르기·몸 상태·운동 정보를
                            Gemini에 전송해 계획 초안을 만드는 데 동의합니다.
                            이름·연락처는 적지 마세요.

                        </label>


                        <button
                            className="planner-primary"
                            disabled={
                                !!busy
                                || !loaded
                            }
                            type="submit"
                        >
                            {
                                busy === "generate"
                                    ? "계획 만드는 중…"
                                    : (
                                        demo
                                            ? "샘플 주간 계획 만들기"
                                            : "AI 주간 계획 만들기"
                                    )
                            }
                        </button>

                    </form>
                )
            }


            {/* ================================================= */}
            {/* Legend */}
            {/* ================================================= */}

            <div className="planner-legend">

                <span>
                    ● 식사
                </span>

                <span>
                    ● 운동
                </span>

                <span>
                    ● 고정 일정
                </span>

                <span>
                    ● 간식
                </span>

                <small>
                    일정을 누르면 수정할 수 있어요
                </small>


                <button
                    type="button"
                    className="planner-secondary"
                    disabled={
                        !!busy
                        || !loaded
                        || events.length >= 64
                    }
                    onClick={
                        () => {

                            const id =
                                crypto.randomUUID();

                            const start =
                                `${week}T${preferences.wakeTime}`;

                            const endDate =
                                new Date(
                                    start
                                );

                            endDate.setMinutes(
                                endDate.getMinutes()
                                + 30
                            );

                            const end =
                                `${week}T${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

                            setEvents(
                                items => [
                                    ...items,

                                    {
                                        id,

                                        kind:
                                            "MEAL",

                                        title:
                                            "새 식사 일정",

                                        details:
                                            "",

                                        start,

                                        end,

                                        intensity:
                                            "",

                                        completed:
                                            false
                                    }
                                ]
                            );

                            setDirty(true);
                            setSelected(id);
                        }
                    }
                >
                    ＋ 일정 추가
                </button>

            </div>


            {/* ================================================= */}
            {/* Calendar */}
            {/* ================================================= */}

            <div
                className="planner-calendar"
                role="region"
                aria-label="주간 식사 운동 캘린더"
                tabIndex={0}
            >

                <div className="planner-calendar-grid">

                    {
                        DAYS.map(
                            (
                                day,
                                index
                            ) => {

                                const date =
                                    shiftDate(
                                        week,
                                        index
                                    );

                                const dayEvents =
                                    events
                                        .filter(
                                            event =>
                                                event
                                                    .start
                                                    .slice(
                                                        0,
                                                        10
                                                    )
                                                === date
                                        )
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                a.start.localeCompare(
                                                    b.start
                                                )
                                        );

                                const calories =
                                    mealCalories(
                                        dayEvents
                                    );

                                const offer =
                                    snackRecommendations(
                                        preferences,
                                        date,
                                        events,
                                        snacks
                                    );

                                const timeline =
                                    [
                                        ...dayEvents,

                                        ...(
                                            offer
                                                ? [
                                                    {
                                                        id:
                                                            "snack-suggestion",

                                                        suggestion:
                                                            true,

                                                        start:
                                                            offer.start
                                                            ||
                                                            `${date}T${preferences.lunchTime}`,

                                                        end:
                                                        offer.end
                                                    }
                                                ]
                                                : []
                                        ),

                                        ...preferences
                                            .busySlots
                                            .filter(
                                                slot =>
                                                    slot.day
                                                    === index
                                            )
                                            .map(
                                                (
                                                    slot,
                                                    slotIndex
                                                ) => ({
                                                    ...slot,

                                                    id:
                                                        `fixed-${slotIndex}`,

                                                    fixed:
                                                        true,

                                                    start:
                                                        `${date}T${slot.start}`,

                                                    end:
                                                        `${date}T${slot.end}`
                                                })
                                            )
                                    ]
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                a.start.localeCompare(
                                                    b.start
                                                )
                                        );

                                return (
                                    <section
                                        className="planner-day"
                                        key={day}
                                        aria-label={
                                            `${date} ${day}요일`
                                        }
                                    >

                                        <header className="planner-day-heading">

                                            <h3>
                                                <button
                                                    type="button"
                                                    className="planner-day-select"
                                                    aria-label={
                                                        `${date} 영양 요약 보기`
                                                    }
                                                    aria-pressed={
                                                        summaryDate
                                                        === date
                                                    }
                                                    onClick={
                                                        () =>
                                                            setSummaryDate(
                                                                date
                                                            )
                                                    }
                                                >
                                                    <span>
                                                        {day}
                                                    </span>

                                                    {
                                                        Number(
                                                            date
                                                                .slice(-2)
                                                        )
                                                    }
                                                </button>
                                            </h3>


                                            <span
                                                className="planner-day-calories"
                                                title="계획된 식사·간식의 열량 합계"
                                                aria-label={
                                                    `${day}요일 식사 열량 ${
                                                        calories.total
                                                        === null
                                                            ? "정보 없음"
                                                            : `${calories.total} 킬로칼로리${calories.partial ? ", 일부 식사만 집계" : ""}`
                                                    }`
                                                }
                                            >
                                                {
                                                    calories.total
                                                    === null
                                                        ? "— kcal"
                                                        : `${calories.total.toLocaleString()} kcal`
                                                }

                                                {
                                                    calories.partial
                                                    &&
                                                    calories.total
                                                    !== null
                                                    && (
                                                        <sup>
                                                            *
                                                        </sup>
                                                    )
                                                }
                                            </span>

                                        </header>


                                        {
                                            timeline.map(
                                                event => {

                                                    if (
                                                        event.suggestion
                                                    ) {

                                                        return (
                                                            <button
                                                                key={event.id}
                                                                type="button"
                                                                className="planner-snack-suggestion"
                                                                disabled={!!busy}
                                                                onClick={
                                                                    () => {

                                                                        setSummaryDate(
                                                                            date
                                                                        );

                                                                        setFocusSnack(
                                                                            value =>
                                                                                value + 1
                                                                        );
                                                                    }
                                                                }
                                                            >
                                                                <small>
                                                                    {
                                                                        offer.start
                                                                            ? `${event.start.slice(11, 16)} · 선택 사항`
                                                                            : "추가 가능 여부 확인"
                                                                    }
                                                                </small>

                                                                <strong>
                                                                    {
                                                                        offer
                                                                            .candidates
                                                                            .length
                                                                            ? "＋ 간식 추천"
                                                                            : "간식 안내"
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    열량{" "}
                                                                    {offer.calorieGap}
                                                                    {" "}kcal · 단백질{" "}
                                                                    {offer.gap.toFixed(1)}
                                                                    g 부족 ·{" "}

                                                                    {
                                                                        offer
                                                                            .candidates
                                                                            .length
                                                                            ? "후보 보기"
                                                                            : "안내 보기"
                                                                    }
                                                                </span>
                                                            </button>
                                                        );
                                                    }


                                                    if (
                                                        event.fixed
                                                    ) {

                                                        return (
                                                            <div
                                                                className="planner-fixed"
                                                                key={event.id}
                                                            >
                                                                <small>
                                                                    {
                                                                        event
                                                                            .start
                                                                            .slice(
                                                                                11,
                                                                                16
                                                                            )
                                                                    }
                                                                    –
                                                                    {
                                                                        event
                                                                            .end
                                                                            .slice(
                                                                                11,
                                                                                16
                                                                            )
                                                                    }
                                                                </small>

                                                                {event.title}

                                                                {
                                                                    (
                                                                        event.allowMeals
                                                                        ||
                                                                        event.allowSnacks
                                                                    )
                                                                    && (
                                                                        <small>
                                                                            {
                                                                                [
                                                                                    event.allowMeals
                                                                                    && "식사 가능",

                                                                                    event.allowSnacks
                                                                                    && "간식 가능"
                                                                                ]
                                                                                    .filter(Boolean)
                                                                                    .join(" · ")
                                                                            }
                                                                        </small>
                                                                    )
                                                                }
                                                            </div>
                                                        );
                                                    }


                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className={
                                                                `planner-event planner-event--${event.kind.toLowerCase()}${event.completed ? " planner-event--done" : ""}`
                                                            }
                                                        >

                                                            <button
                                                                type="button"
                                                                disabled={!!busy}
                                                                onClick={
                                                                    () => {

                                                                        setSelected(
                                                                            event.id
                                                                        );

                                                                        setSummaryDate(
                                                                            event
                                                                                .start
                                                                                .slice(
                                                                                    0,
                                                                                    10
                                                                                )
                                                                        );
                                                                    }
                                                                }
                                                            >
                                                                <small>
                                                                    {
                                                                        event
                                                                            .start
                                                                            .slice(
                                                                                11,
                                                                                16
                                                                            )
                                                                    }
                                                                    –
                                                                    {
                                                                        event
                                                                            .end
                                                                            .slice(
                                                                                11,
                                                                                16
                                                                            )
                                                                    }
                                                                </small>

                                                                <strong title={event.title}>
                                                                    {
                                                                        event.kind
                                                                        === "SNACK"
                                                                        && (
                                                                            <span>
                                                                                간식 ·{" "}
                                                                            </span>
                                                                        )
                                                                    }

                                                                    {event.title}
                                                                </strong>
                                                            </button>


                                                            <label>
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={!!busy}
                                                                    checked={
                                                                        event.completed
                                                                    }
                                                                    onChange={
                                                                        change => {

                                                                            edit(
                                                                                event.id,
                                                                                {
                                                                                    completed:
                                                                                    change
                                                                                        .target
                                                                                        .checked
                                                                                }
                                                                            );

                                                                            setSummaryDate(
                                                                                event
                                                                                    .start
                                                                                    .slice(
                                                                                        0,
                                                                                        10
                                                                                    )
                                                                            );
                                                                        }
                                                                    }
                                                                    aria-label={
                                                                        `${event.title} 완료`
                                                                    }
                                                                />

                                                                <span className="planner-sr-only">
                                                                    완료
                                                                </span>
                                                            </label>

                                                        </div>
                                                    );
                                                }
                                            )
                                        }


                                        {
                                            !timeline.length
                                            && (
                                                <p className="planner-no-event">
                                                    계획을 추가해 보세요
                                                </p>
                                            )
                                        }

                                    </section>
                                );
                            }
                        )
                    }

                </div>
            </div>


            <p className="planner-calorie-note">
                열량은 등록된 레시피의 원문 합계예요.
                실제 섭취량과 다를 수 있어요.
                * 일부 식사만 집계 · — 영양정보 없음
            </p>


            {/* ================================================= */}
            {/* Event detail */}
            {/* ================================================= */}

            {
                chosen
                && (
                    <section
                        className="planner-editor planner-detail"
                        ref={editor}
                        aria-label="일정 상세"
                    >

                        <header className="planner-detail-heading">

                            <div>
                                <span className="planner-detail-kicker">
                                    {
                                        chosen.kind === "MEAL"
                                            ? "식사"
                                            : (
                                                chosen.kind
                                                === "SNACK"
                                                    ? "간식"
                                                    : "운동"
                                            )
                                    }

                                    {" · "}

                                    {
                                        chosen
                                            .start
                                            .slice(
                                                5,
                                                10
                                            )
                                            .replace(
                                                "-",
                                                "."
                                            )
                                    }

                                    {" · "}

                                    {
                                        chosen
                                            .start
                                            .slice(
                                                11,
                                                16
                                            )
                                    }

                                    –

                                    {
                                        chosen
                                            .end
                                            .slice(
                                                11,
                                                16
                                            )
                                    }
                                </span>

                                <h3>
                                    {chosen.title}
                                </h3>
                            </div>


                            <button
                                type="button"
                                className="planner-detail-close"
                                aria-label="편집 닫기"
                                onClick={
                                    () =>
                                        setSelected(
                                            null
                                        )
                                }
                            >
                                ×
                            </button>

                        </header>


                        {
                            chosen.kind
                            !== "EXERCISE"
                                ? (
                                    <>

                                        <div className="planner-detail-nutrients">

                                            <div className="planner-energy">

                                                <span>
                                                    열량 ·{" "}
                                                    {
                                                        chosen
                                                            .foodEvidence
                                                            ?.components
                                                            ?.length
                                                            ? "제안량 합계"
                                                            : "원문"
                                                    }
                                                </span>

                                                <strong>
                                                    {
                                                        chosen.kind
                                                        === "SNACK"
                                                            ? formatNutrient(
                                                                chosen
                                                                    .foodEvidence
                                                                    ?.nutrition
                                                                    ?.INFO_ENG
                                                            )
                                                            : (
                                                                chosen
                                                                    .foodEvidence
                                                                    ?.nutrition
                                                                    ?.INFO_ENG
                                                                    ?.trim()
                                                                || "—"
                                                            )
                                                    }

                                                    <small>
                                                        {" "}kcal
                                                    </small>
                                                </strong>

                                            </div>


                                            <Macros
                                                evidence={
                                                    chosen.foodEvidence
                                                }
                                                rounded={
                                                    chosen.kind
                                                    === "SNACK"
                                                }
                                            />

                                        </div>


                                        {
                                            chosen.foodEvidence
                                                ? (
                                                    <>

                                                        <p className="planner-detail-caption">
                                                            {
                                                                chosen
                                                                    .foodEvidence
                                                                    .components
                                                                    ?.length
                                                                    ? "음식별 제안량으로 환산한 합계 · 실제 조리법에 따라 달라집니다."
                                                                    : "레시피 원문 기준 · 개인별 권장량이 아닙니다."
                                                            }
                                                        </p>


                                                        {
                                                            !!chosen
                                                                .foodEvidence
                                                                .components
                                                                ?.length
                                                            && (
                                                                <MealComponents
                                                                    components={
                                                                        chosen
                                                                            .foodEvidence
                                                                            .components
                                                                    }
                                                                />
                                                            )
                                                        }


                                                        {
                                                            chosen.kind
                                                            === "SNACK"
                                                            && (
                                                                <p className="planner-detail-caption">
                                                                    {chosen.details}
                                                                </p>
                                                            )
                                                        }


                                                        <details className="planner-detail-disclosure">

                                                            <summary>
                                                                재료와 영양 기준
                                                            </summary>

                                                            <p>
                                                                {
                                                                    chosen
                                                                        .foodEvidence
                                                                        .ingredients
                                                                }
                                                            </p>

                                                            <div className="planner-detail-meta">

                                                                <span>
                                                                    {
                                                                        chosen
                                                                            .foodEvidence
                                                                            .components
                                                                            ?.length
                                                                            ? "제안량 합계(g)"
                                                                            : "원문 중량"
                                                                    }

                                                                    {" "}

                                                                    <b>
                                                                        {
                                                                            chosen
                                                                                .foodEvidence
                                                                                .servingWeight
                                                                            || "미제공"
                                                                        }
                                                                    </b>
                                                                </span>

                                                                <span>
                                                                    나트륨{" "}

                                                                    <b>
                                                                        {
                                                                            chosen
                                                                                .foodEvidence
                                                                                .nutrition
                                                                                .INFO_NA
                                                                            || "미제공"
                                                                        }
                                                                    </b>
                                                                </span>

                                                            </div>


                                                            <p className="planner-help">
                                                                {
                                                                    chosen
                                                                        .foodEvidence
                                                                        .components
                                                                        ?.length
                                                                        ? "구성 음식별 원문 기준량과 제안량을 구분해 계산합니다. 이 자료에는 개별 음식의 조리법과 재료 목록이 없습니다."
                                                                        : "단위·기준량은 원문을 확인해 주세요. 중량이 없는 자료는 1인분으로 환산하지 않습니다."
                                                                }
                                                            </p>

                                                        </details>


                                                        <details className="planner-detail-disclosure">

                                                            <summary>
                                                                출처 확인
                                                            </summary>

                                                            <p>
                                                                {
                                                                    chosen
                                                                        .foodEvidence
                                                                        .components
                                                                        ?.length
                                                                        ? "식약처 식품영양성분 DB · 조합"
                                                                        : "식품안전나라 · 레시피"
                                                                }

                                                                {" "}

                                                                {
                                                                    chosen
                                                                        .foodEvidence
                                                                        .recipeId
                                                                }

                                                                {" · "}

                                                                {
                                                                    chosen
                                                                        .foodEvidence
                                                                        .retrievedAt
                                                                        .slice(
                                                                            0,
                                                                            10
                                                                        )
                                                                } 수집
                                                            </p>


                                                            {
                                                                chosen
                                                                    .foodEvidence
                                                                    .sourceUrl
                                                                ===
                                                                "https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_no=661&svc_no=COOKRCP01"
                                                                && (
                                                                    <a
                                                                        href={
                                                                            chosen
                                                                                .foodEvidence
                                                                                .sourceUrl
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        레시피 DB 원문 보기 ↗
                                                                    </a>
                                                                )
                                                            }

                                                        </details>

                                                    </>
                                                )
                                                : (
                                                    <p className="planner-detail-caption">
                                                        연결된 영양정보가 없습니다.
                                                        새 식단을 생성하면 확인할 수 있어요.
                                                    </p>
                                                )
                                        }

                                    </>
                                )
                                : (
                                    <ExerciseDetails
                                        event={chosen}
                                    />
                                )
                        }


                        <details className="planner-detail-disclosure planner-edit-disclosure">

                            <summary>
                                시간·내용 수정
                            </summary>

                            <p className="planner-help">
                                이름·내용·종류를 바꾸면
                                영양정보와 운동 근거 연결이 해제됩니다.
                                운동 강도를 바꾸면
                                운동 근거 연결이 해제됩니다.
                            </p>


                            <fieldset disabled={!!busy}>

                                <div className="planner-form-grid">

                                    <label>
                                        종류

                                        <select
                                            value={chosen.kind}
                                            onChange={
                                                event =>
                                                    edit(
                                                        chosen.id,
                                                        {
                                                            kind:
                                                            event
                                                                .target
                                                                .value,

                                                            intensity:
                                                                event
                                                                    .target
                                                                    .value
                                                                === "EXERCISE"
                                                                    ? "가볍게"
                                                                    : ""
                                                        }
                                                    )
                                            }
                                        >
                                            <option value="MEAL">
                                                식사
                                            </option>

                                            <option value="SNACK">
                                                간식
                                            </option>

                                            <option value="EXERCISE">
                                                운동
                                            </option>
                                        </select>
                                    </label>


                                    <label>
                                        제목

                                        <input
                                            maxLength={60}
                                            value={chosen.title}
                                            onChange={
                                                event =>
                                                    edit(
                                                        chosen.id,
                                                        {
                                                            title:
                                                            event
                                                                .target
                                                                .value
                                                        }
                                                    )
                                            }
                                        />
                                    </label>


                                    <label>
                                        시작

                                        <input
                                            type="datetime-local"
                                            value={
                                                chosen
                                                    .start
                                                    .slice(
                                                        0,
                                                        16
                                                    )
                                            }
                                            onChange={
                                                event =>
                                                    edit(
                                                        chosen.id,
                                                        {
                                                            start:
                                                            event
                                                                .target
                                                                .value
                                                        }
                                                    )
                                            }
                                        />
                                    </label>


                                    <label>
                                        종료

                                        <input
                                            type="datetime-local"
                                            value={
                                                chosen
                                                    .end
                                                    .slice(
                                                        0,
                                                        16
                                                    )
                                            }
                                            onChange={
                                                event =>
                                                    edit(
                                                        chosen.id,
                                                        {
                                                            end:
                                                            event
                                                                .target
                                                                .value
                                                        }
                                                    )
                                            }
                                        />
                                    </label>


                                    {
                                        chosen.kind
                                        === "EXERCISE"
                                        && (
                                            <label>
                                                강도

                                                <select
                                                    value={
                                                        chosen.intensity
                                                    }
                                                    onChange={
                                                        event =>
                                                            edit(
                                                                chosen.id,
                                                                {
                                                                    intensity:
                                                                    event
                                                                        .target
                                                                        .value
                                                                }
                                                            )
                                                    }
                                                >
                                                    <option>
                                                        가볍게
                                                    </option>

                                                    <option>
                                                        보통
                                                    </option>
                                                </select>
                                            </label>
                                        )
                                    }

                                </div>


                                <label>
                                    상세 계획

                                    <textarea
                                        maxLength={500}
                                        value={
                                            chosen.details
                                        }
                                        onChange={
                                            event =>
                                                edit(
                                                    chosen.id,
                                                    {
                                                        details:
                                                        event
                                                            .target
                                                            .value
                                                    }
                                                )
                                        }
                                    />
                                </label>


                                <div className="planner-editor-actions">

                                    <button
                                        type="button"
                                        onClick={
                                            () => {

                                                setEvents(
                                                    items =>
                                                        items.filter(
                                                            item =>
                                                                item.id
                                                                !== chosen.id
                                                        )
                                                );

                                                setDirty(true);
                                                setSelected(null);
                                            }
                                        }
                                    >
                                        일정 삭제
                                    </button>

                                </div>

                            </fieldset>

                        </details>

                    </section>
                )
            }


            {
                !!notices.length
                && (
                    <details className="planner-notices">

                        <summary>
                            일정 조정 안내 {notices.length}건
                        </summary>

                        <ul>
                            {
                                notices.map(
                                    (
                                        notice,
                                        index
                                    ) => (
                                        <li key={index}>
                                            {notice}
                                        </li>
                                    )
                                )
                            }
                        </ul>

                    </details>
                )
            }


            {/* ================================================= */}
            {/* Footer */}
            {/* ================================================= */}

            <footer className="planner-footer">

                <p>
                    생활 계획을 위한 참고 초안이에요.
                    알레르기와 의료진의 제한을 확인하고 확정해 주세요.
                    투약 일정은 변경하지 않아요.
                </p>

                <button
                    type="button"
                    className="planner-primary"
                    disabled={
                        !!busy
                        || !loaded
                        || !dirty
                    }
                    onClick={save}
                >
                    {
                        demo
                            ? "미리보기에서 확정"
                            : "확정하고 저장"
                    }
                </button>

            </footer>

        </section>
    );
}