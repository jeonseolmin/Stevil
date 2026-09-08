import axiosInstance from "./axiosInstance";

export const getDashboard = () => axiosInstance.get("/dashboard");
export const getActiveAds = () => axiosInstance.get("/ads/active");
export const getDashboardAds = () => axiosInstance.get("/ads/dashboard-ads");

