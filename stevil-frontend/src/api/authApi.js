import axiosInstance, {
    clearAccessToken,
} from "./axiosInstance";

export const logout = async () => {
    await axiosInstance.post("/auth/logout");
    clearAccessToken();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
    // A full navigation discards pending authentication requests and memory tokens.
    window.location.replace("/");
};
