export const formatWeight = (value) =>
    value === null || value === undefined ? "-" : Number(value).toFixed(1);

export const formatDate = (dateTime) =>
    dateTime
        ? new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(new Date(dateTime))
        : "";

export const clampProgressRate = (value) =>
    Math.min(100, Math.max(0, Number(value ?? 0)));

export const splitDashboardAds = (activeAds, dashboardAds) => ({
    topBanners: Array.isArray(activeAds)
        ? activeAds.filter((ad) => ad.adType === "TOP_BANNER")
        : [],
    sponsorAds: Array.isArray(dashboardAds?.REPORT_SPONSOR)
        ? dashboardAds.REPORT_SPONSOR
        : [],
    loginPopups: Array.isArray(dashboardAds?.LOGIN_POPUP)
        ? dashboardAds.LOGIN_POPUP
        : [],
});

export const todayKey = () => new Date().toISOString().split("T")[0];

