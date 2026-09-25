import axiosInstance from "./axiosInstance";

// 백엔드 UserDevice 등록/해제 (PR-A). 값은 FCM Firebase Installation ID(FID). 사용자는 JWT 로만 식별된다.
export const registerDeviceToken = (token) =>
    axiosInstance.post("/notifications/token", { token, platform: "WEB" });

export const unregisterDeviceToken = (token) =>
    axiosInstance.delete("/notifications/token", { data: { token }, timeout: 1500 });
