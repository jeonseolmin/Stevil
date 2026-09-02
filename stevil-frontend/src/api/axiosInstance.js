import axios from "axios";

let accessToken = null;
let isRefreshing = false;
let refreshQueue = [];

export const setAccessToken = (token) => {
    accessToken = token;
};

export const clearAccessToken = () => {
    accessToken = null;
};

const axiosInstance = axios.create({
    baseURL:
        import.meta.env.VITE_API_BASE_URL ||
        "/api",
    timeout: 10000,
    withCredentials: true,
});



axiosInstance.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization =
                `Bearer ${accessToken}`;
        }

        return config;
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest =
            error.config;

        if (
            error.response?.status !== 401 ||
            originalRequest?._retry ||
            originalRequest?.url ===
            "/auth/refresh"
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise(
                (resolve, reject) => {
                    refreshQueue.push({
                        resolve,
                        reject,
                    });
                }
            ).then((newToken) => {
                originalRequest.headers.Authorization =
                    `Bearer ${newToken}`;

                return axiosInstance(
                    originalRequest
                );
            });
        }

        isRefreshing = true;

        try {
            /*
             * interceptor가 다시 interceptor를 타지 않도록
             * 일반 axios를 사용합니다.
             */
            const response =
                await axios.post(
                    `${
                        import.meta.env
                            .VITE_API_BASE_URL ||
                        "/api"
                    }/auth/refresh`,
                    null,
                    {
                        withCredentials: true,
                    }
                );

            const newAccessToken =
                response.data.accessToken;

            setAccessToken(
                newAccessToken
            );

            refreshQueue.forEach(
                ({ resolve }) =>
                    resolve(
                        newAccessToken
                    )
            );

            refreshQueue = [];

            originalRequest.headers.Authorization =
                `Bearer ${newAccessToken}`;

            return axiosInstance(
                originalRequest
            );

        } catch (refreshError) {

            clearAccessToken();

            refreshQueue.forEach(
                ({ reject }) =>
                    reject(
                        refreshError
                    )
            );

            refreshQueue = [];

            return Promise.reject(
                refreshError
            );

        } finally {
            isRefreshing = false;
        }
    }
);

export default axiosInstance;