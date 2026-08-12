import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosInstance from "../../api/axiosInstance";

function OAuthSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const handleOAuthSuccess = async () => {
            const token = searchParams.get("token");

            if (!token) {
                navigate("/login", {
                    replace: true,
                    state: {
                        errorMessage: "로그인 정보를 확인할 수 없습니다.",
                    },
                });
                return;
            }

            localStorage.setItem("accessToken", token);

            try {
                const response = await axiosInstance.get("/users/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const user = response.data;

                navigate(
                    user.onboardingCompleted
                        ? "/dashboard"
                        : "/onboarding",
                    { replace: true }
                );
            } catch (error) {
                console.error(
                    "사용자 정보 조회 실패:",
                    error.response?.status,
                    error.response?.data ?? error.message
                );

                localStorage.removeItem("accessToken");

                navigate("/login", {
                    replace: true,
                    state: {
                        errorMessage: "로그인 처리 중 오류가 발생했습니다.",
                    },
                });
            }
        };

        handleOAuthSuccess();
    }, [navigate, searchParams]);

    return (
        <main className="oauth-success-page">
            <p>로그인 정보를 확인하고 있습니다.</p>
        </main>
    );
}

export default OAuthSuccessPage;