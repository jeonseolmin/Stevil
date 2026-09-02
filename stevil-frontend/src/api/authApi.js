import axiosInstance, {
    clearAccessToken,
} from "./axiosInstance";

export const logout = async () => {
    try {
        await axiosInstance.post(
            "/auth/logout"
        );
    } finally {
        clearAccessToken();

        localStorage.removeItem(
            "userRole"
        );
    }
};