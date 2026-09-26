import axiosInstance from "./axiosInstance";

// 백엔드 UserDevice 등록/해제 (PR-A). 값은 FCM Firebase Installation ID(FID). 사용자는 JWT 로만 식별된다.
export const registerDeviceToken = (token) =>
    axiosInstance.post("/notifications/token", { token, platform: "WEB" });

export const unregisterDeviceToken = (token) =>
    axiosInstance.delete("/notifications/token", { data: { token }, timeout: 1500 });

// 알림 목록/읽음 (PR-A API). 목록은 Spring Page 형태({ content, last, ... }).
export const fetchNotifications = (page = 0, size = 20) =>
    axiosInstance.get("/notifications", { params: { page, size } }).then((r) => r.data);

export const fetchUnreadCount = () =>
    axiosInstance.get("/notifications/unread-count").then((r) => r.data.count);

export const markNotificationRead = (id) =>
    axiosInstance.patch(`/notifications/${id}/read`).then((r) => r.data);

export const markAllNotificationsRead = () =>
    axiosInstance.patch("/notifications/read-all").then((r) => r.data.updated);

/* 읽음 상태가 바뀌었음을 벨(unread badge)에 알린다. */
export const notifyNotificationsChanged = () =>
    window.dispatchEvent(new Event("notifications:changed"));
