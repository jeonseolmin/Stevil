import axios from "axios";
import { backendUrl } from "./backendUrl";

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || backendUrl("/api"),
    timeout: 10000,
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

// 온보딩 미완료 사용자가 로그인 필요 화면에 진입하면 백엔드가 이 메시지로 403을 준다.
// 화면이 빈 상태로 남는 대신 온보딩으로 돌려보낸다.
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        const isOnboardingRequired =
            error.response?.status === 403 &&
            error.response?.data?.message === "온보딩을 먼저 완료해주세요.";

        if (isOnboardingRequired && window.location.pathname !== "/onboarding") {
            window.location.assign("/onboarding");
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;
// Keep the current backend OAuth token contract.
export const clearAccessToken = () => localStorage.removeItem("accessToken");
