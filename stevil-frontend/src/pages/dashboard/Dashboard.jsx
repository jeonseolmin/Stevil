import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getActiveAds, getDashboard, getDashboardAds } from "../../api/dashboardApi.js";
import { clearAccessToken } from "../../api/axiosInstance.js";
import DashboardDailyCards from "../../components/dashboard/DashboardDailyCards.jsx";
import DashboardMedicalNotice from "../../components/dashboard/DashboardMedicalNotice.jsx";
import DashboardQuickActions from "../../components/dashboard/DashboardQuickActions.jsx";
import DashboardWeightChart from "../../components/dashboard/DashboardWeightChart.jsx";
import DashboardWeightSummary from "../../components/dashboard/DashboardWeightSummary.jsx";
import DashboardWelcome from "../../components/dashboard/DashboardWelcome.jsx";
import DashboardPopupAd from "../../components/dashboard/ads/DashboardPopupAd.jsx";
import DashboardSponsor from "../../components/dashboard/ads/DashboardSponsor.jsx";
import DashboardTopBanner from "../../components/dashboard/ads/DashboardTopBanner.jsx";
import { clampProgressRate, splitDashboardAds, todayKey } from "../../components/dashboard/dashboardUtils.js";
import WeeklyPlanner from "../../components/planner/WeeklyPlanner.jsx";
import DashboardChatWidget from "../../components/rag/DashboardChatWidget.jsx";
import "./Dashboard.css";

export default function Dashboard({ previewData = null }) {
    const navigate = useNavigate();
    const preview = import.meta.env.DEV && previewData !== null;
    const [dashboard, setDashboard] = useState(preview ? previewData : null);
    const [isLoading, setIsLoading] = useState(!preview);
    const [error, setError] = useState("");
    const [topBanners, setTopBanners] = useState([]);
    const [sponsorAds, setSponsorAds] = useState([]);
    const [popupAd, setPopupAd] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

    useEffect(() => {
        if (preview) return;

        const fetchDashboard = async () => {
            try {
                setIsLoading(true);
                setError("");
                const response = await getDashboard();
                setDashboard(response.data);
            } catch (requestError) {
                const status = requestError.response?.status;
                if (status === 401 || status === 403) {
                    clearAccessToken();
                    localStorage.removeItem("userRole");
                    navigate("/login", { replace: true });
                    return;
                }
                if (status === 409) {
                    navigate("/onboarding", { replace: true });
                    return;
                }
                setError(requestError.response?.data?.message || "대시보드 정보를 불러오지 못했습니다.");
            } finally {
                setIsLoading(false);
            }
        };

        const fetchAds = async () => {
            try {
                const [activeResponse, dashboardResponse] = await Promise.all([getActiveAds(), getDashboardAds()]);
                const ads = splitDashboardAds(activeResponse.data, dashboardResponse.data ?? {});
                setTopBanners(ads.topBanners);
                setSponsorAds(ads.sponsorAds);
                if (ads.loginPopups.length && localStorage.getItem("hidePopupDate") !== todayKey()) {
                    setPopupAd(ads.loginPopups[0]);
                    setShowPopup(true);
                }
            } catch (adError) {
                console.error("광고 불러오기 실패:", adError);
            }
        };

        fetchDashboard();
        fetchAds();
    }, [navigate, preview]);

    const closePopupToday = () => {
        localStorage.setItem("hidePopupDate", todayKey());
        setShowPopup(false);
    };

    if (isLoading) {
        return <div className="dashboard-state"><div className="dashboard-spinner" aria-hidden="true" /><p>건강 기록을 불러오고 있습니다.</p></div>;
    }
    if (error) {
        return <div className="dashboard-state dashboard-state--error"><h1>대시보드를 불러오지 못했습니다</h1><p>{error}</p><button type="button" onClick={() => window.location.reload()}>다시 시도</button></div>;
    }
    if (!dashboard) return null;

    const recordWeight = () => navigate("/weight");

    return (
        <div className="dashboard-page">
            <DashboardPopupAd ad={popupAd} open={showPopup} onClose={() => setShowPopup(false)} onCloseToday={closePopupToday} />
            <DashboardChatWidget preview={preview} />
            <div className="dashboard-container">
                <DashboardTopBanner ads={topBanners} />
                <DashboardWelcome nickname={dashboard.nickname} profileImage={dashboard.profileImage} />
                <DashboardWeightSummary dashboard={dashboard} progressRate={clampProgressRate(dashboard.progressRate)} onRecord={recordWeight} />
                <section className="dashboard-content-grid">
                    <DashboardWeightChart recentWeights={dashboard.recentWeights} onRecord={recordWeight} />
                    <DashboardQuickActions navigate={navigate} />
                </section>
                <WeeklyPlanner preview={preview} />
                <DashboardDailyCards navigate={navigate} />
                <DashboardMedicalNotice />
                <DashboardSponsor ads={sponsorAds} />
            </div>
        </div>
    );
}
