import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getActiveAds,
    getDashboard,
    getDashboardAds,
} from "../../api/dashboardApi.js";

import {
    clearAccessToken,
} from "../../api/axiosInstance.js";

import DashboardDailyCards
    from "../../components/dashboard/DashboardDailyCards.jsx";

import DashboardMedicalNotice
    from "../../components/dashboard/DashboardMedicalNotice.jsx";

import DashboardQuickActions
    from "../../components/dashboard/DashboardQuickActions.jsx";

import DashboardWeightChart
    from "../../components/dashboard/DashboardWeightChart.jsx";

import DashboardWeightSummary
    from "../../components/dashboard/DashboardWeightSummary.jsx";

import DashboardWelcome
    from "../../components/dashboard/DashboardWelcome.jsx";

import DashboardPopupAd
    from "../../components/dashboard/ads/DashboardPopupAd.jsx";

import DashboardSponsor
    from "../../components/dashboard/ads/DashboardSponsor.jsx";

import DashboardTopBanner
    from "../../components/dashboard/ads/DashboardTopBanner.jsx";

import {
    clampProgressRate,
    splitDashboardAds,
    todayKey,
} from "../../components/dashboard/dashboardUtils.js";

import WeeklyPlanner
    from "../../components/planner/WeeklyPlanner.jsx";

import DashboardChatWidget
    from "../../components/rag/DashboardChatWidget.jsx";

import "./Dashboard.css";


export default function Dashboard({
                                      previewData = null,
                                  }) {
    const navigate =
        useNavigate();

    const preview =
        import.meta.env.DEV &&
        previewData !== null;

    const [
        dashboard,
        setDashboard,
    ] = useState(
        preview
            ? previewData
            : null
    );

    const [
        isLoading,
        setIsLoading,
    ] = useState(
        !preview
    );

    const [
        error,
        setError,
    ] = useState("");

    // =====================================================
    // Advertisement state
    // =====================================================

    const [
        topBanners,
        setTopBanners,
    ] = useState([]);

    const [
        sponsorAds,
        setSponsorAds,
    ] = useState([]);

    const [
        popupAd,
        setPopupAd,
    ] = useState(null);

    const [
        showPopup,
        setShowPopup,
    ] = useState(false);


    // =====================================================
    // Initial load
    // =====================================================

    useEffect(() => {
        if (preview) {
            return;
        }

        let active = true;


        // =================================================
        // Dashboard
        // =================================================

        const fetchDashboard = async () => {
            try {
                setIsLoading(true);
                setError("");

                const response =
                    await getDashboard();

                if (!active) {
                    return;
                }

                setDashboard(
                    response.data
                );

            } catch (
                requestError
                ) {
                if (!active) {
                    return;
                }

                const status =
                    requestError
                        .response
                        ?.status;


                // -----------------------------------------
                // Authentication failure
                // -----------------------------------------

                if (
                    status === 401
                ) {
                    clearAccessToken();

                    localStorage.removeItem(
                        "userRole"
                    );

                    navigate(
                        "/login",
                        {
                            replace: true,
                        }
                    );

                    return;
                }


                // -----------------------------------------
                // Authorization failure
                // -----------------------------------------

                if (
                    status === 403
                ) {
                    setError(
                        "대시보드에 접근할 권한이 없습니다."
                    );

                    return;
                }


                // -----------------------------------------
                // Onboarding required
                // -----------------------------------------

                if (
                    status === 409
                ) {
                    navigate(
                        "/onboarding",
                        {
                            replace: true,
                        }
                    );

                    return;
                }


                // -----------------------------------------
                // Other error
                // -----------------------------------------

                setError(
                    requestError
                        .response
                        ?.data
                        ?.message
                    ||
                    "대시보드 정보를 불러오지 못했습니다."
                );

            } finally {
                if (
                    active
                ) {
                    setIsLoading(
                        false
                    );
                }
            }
        };


        // =================================================
        // Top banner advertisement
        //
        // 광고 API는 각각 독립적으로 처리합니다.
        // 하나가 실패해도 다른 광고까지 영향을
        // 받지 않도록 합니다.
        // =================================================

        const fetchActiveAds = async () => {
            try {
                const response =
                    await getActiveAds();

                if (!active) {
                    return;
                }

                const activeAds =
                    Array.isArray(
                        response.data
                    )
                        ? response.data
                        : [];

                setTopBanners(
                    activeAds.filter(
                        (ad) =>
                            ad.adType ===
                            "TOP_BANNER"
                    )
                );

            } catch (
                adError
                ) {
                if (!active) {
                    return;
                }

                setTopBanners([]);

                console.error(
                    "상단 광고 조회 실패:",
                    adError
                        .response
                        ?.status
                    ??
                    adError.message
                );
            }
        };


        // =================================================
        // Dashboard advertisements
        // =================================================

        const fetchDashboardAds =
            async () => {
                try {
                    const response =
                        await getDashboardAds();

                    if (!active) {
                        return;
                    }

                    const dashboardAds =
                        response.data &&
                        typeof response.data ===
                        "object"
                            ? response.data
                            : {};

                    /*
                     * splitDashboardAds는 기존 구조를
                     * 그대로 재사용합니다.
                     *
                     * active ads가 여기서는 없기 때문에
                     * 빈 배열을 전달합니다.
                     */
                    const ads =
                        splitDashboardAds(
                            [],
                            dashboardAds
                        );

                    setSponsorAds(
                        ads.sponsorAds
                    );


                    // -------------------------------------
                    // Popup
                    // -------------------------------------

                    if (
                        !ads.loginPopups
                            .length
                    ) {
                        setPopupAd(
                            null
                        );

                        setShowPopup(
                            false
                        );

                        return;
                    }

                    const hiddenDate =
                        localStorage.getItem(
                            "hidePopupDate"
                        );

                    if (
                        hiddenDate ===
                        todayKey()
                    ) {
                        setPopupAd(
                            null
                        );

                        setShowPopup(
                            false
                        );

                        return;
                    }

                    setPopupAd(
                        ads.loginPopups[0]
                    );

                    setShowPopup(
                        true
                    );

                } catch (
                    adError
                    ) {
                    if (!active) {
                        return;
                    }

                    setSponsorAds(
                        []
                    );

                    setPopupAd(
                        null
                    );

                    setShowPopup(
                        false
                    );

                    console.error(
                        "대시보드 광고 조회 실패:",
                        adError
                            .response
                            ?.status
                        ??
                        adError.message
                    );
                }
            };


        fetchDashboard();

        fetchActiveAds();

        fetchDashboardAds();


        return () => {
            active = false;
        };

    }, [
        navigate,
        preview,
    ]);


    // =====================================================
    // Popup handlers
    // =====================================================

    const closePopup = () => {
        setShowPopup(
            false
        );
    };


    const closePopupToday =
        () => {
            localStorage.setItem(
                "hidePopupDate",
                todayKey()
            );

            setShowPopup(
                false
            );
        };


    // =====================================================
    // Loading
    // =====================================================

    if (
        isLoading
    ) {
        return (
            <div className="dashboard-state">

                <div
                    className="dashboard-spinner"
                    aria-hidden="true"
                />

                <p>
                    건강 기록을
                    불러오고 있습니다.
                </p>

            </div>
        );
    }


    // =====================================================
    // Error
    // =====================================================

    if (
        error
    ) {
        return (
            <div
                className="
                    dashboard-state
                    dashboard-state--error
                "
            >
                <h1>
                    대시보드를
                    불러오지 못했습니다
                </h1>

                <p>
                    {error}
                </p>

                <button
                    type="button"
                    onClick={() =>
                        window.location.reload()
                    }
                >
                    다시 시도
                </button>

            </div>
        );
    }


    if (
        !dashboard
    ) {
        return null;
    }


    // =====================================================
    // Common actions
    // =====================================================

    const recordWeight =
        () => {
            navigate(
                "/weight"
            );
        };


    const progressRate =
        clampProgressRate(
            dashboard.progressRate
        );


    // =====================================================
    // Render
    // =====================================================

    return (
        <div className="dashboard-page">

            {/* =================================================
                Popup advertisement
            ================================================= */}

            <DashboardPopupAd
                ad={
                    popupAd
                }
                open={
                    showPopup
                }
                onClose={
                    closePopup
                }
                onCloseToday={
                    closePopupToday
                }
            />


            {/* =================================================
                RAG Chat
            ================================================= */}

            <DashboardChatWidget
                preview={
                    preview
                }
            />


            <div className="dashboard-container">

                {/* =============================================
                    Top advertisement
                ============================================= */}

                <DashboardTopBanner
                    ads={
                        topBanners
                    }
                />


                {/* =============================================
                    Welcome
                ============================================= */}

                <DashboardWelcome
                    nickname={
                        dashboard.nickname
                    }
                    profileImage={
                        dashboard.profileImage
                    }
                />


                {/* =============================================
                    Weight summary
                ============================================= */}

                <DashboardWeightSummary
                    dashboard={
                        dashboard
                    }
                    progressRate={
                        progressRate
                    }
                    onRecord={
                        recordWeight
                    }
                />


                {/* =============================================
                    Weight chart + Quick actions
                ============================================= */}

                <section className="dashboard-content-grid">

                    <DashboardWeightChart
                        recentWeights={
                            dashboard.recentWeights ??
                            []
                        }
                        onRecord={
                            recordWeight
                        }
                    />

                    <DashboardQuickActions
                        navigate={
                            navigate
                        }
                    />

                </section>


                {/* =============================================
                    Weekly planner
                ============================================= */}

                <WeeklyPlanner
                    preview={
                        preview
                    }
                />


                {/* =============================================
                    Daily records
                ============================================= */}

                <DashboardDailyCards
                    navigate={
                        navigate
                    }
                />


                {/* =============================================
                    Medical notice
                ============================================= */}

                <DashboardMedicalNotice />


                {/* =============================================
                    Sponsor
                ============================================= */}

                <DashboardSponsor
                    ads={
                        sponsorAds
                    }
                />

            </div>
        </div>
    );
}