import axiosInstance from "./axiosInstance";

// 개인 리마인더 (PR-C API). userId 는 JWT 로만 식별된다.
export const fetchReminders = () => axiosInstance.get("/reminders").then((r) => r.data);

export const createReminder = (body) => axiosInstance.post("/reminders", body).then((r) => r.data);

export const updateReminder = (id, body) => axiosInstance.patch(`/reminders/${id}`, body).then((r) => r.data);

export const setReminderEnabled = (id, enabled) =>
    axiosInstance.patch(`/reminders/${id}/enabled`, { enabled }).then((r) => r.data);

export const deleteReminder = (id) => axiosInstance.delete(`/reminders/${id}`);

/*
 * 서버 에러 본문에는 메시지가 실리지 않으므로(server.error.include-message 기본값) 상태 코드로 안내한다.
 * 입력 규칙(식사 종류, 요일, 20개 한도 등)은 화면에서 먼저 검사한다.
 */
export const reminderErrorMessage = (error) => {
    switch (error?.response?.status) {
        case 409:
            return "같은 시간·요일의 알림이 이미 있어요.";
        case 400:
            return "입력값을 확인해 주세요.";
        case 404:
            return "알림을 찾을 수 없어요. 새로고침해 주세요.";
        default:
            return "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
    }
};
