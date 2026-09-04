import { useEffect } from "react";
import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";

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
                        errorMessage:
                            "로그인 정보를 확인할 수 없습니다.",
                    },
                });

                return;
            }

            localStorage.setItem(
                "accessToken",
                token
            );

            try {
                const response =
                    await axiosInstance.get(
                        "/users/me"
                    );

                const user = response.data;
                localStorage.setItem(
                    "userRole",
                    user.role
                );

                /*
                 * 관리자 계정은 온보딩 여부와 관계없이
                 * 관리자 페이지로 이동합니다.
                 */
                if (user.role === "ROLE_ADMIN") {
                    navigate("/admin", {
                        replace: true,
                    });

                    return;
                }

                if (user.role === "ROLE_DOCTOR") {
                    navigate("/doctor/dashboard", {
                        replace: true,
                    });

                    return;
                }

                /*
                 * 일반 회원만 온보딩 완료 여부를 확인합니다.
                 */
                if (user.onboardingCompleted) {
                    navigate("/dashboard", {
                        replace: true,
                    });

                    return;
                }

                navigate("/onboarding", {
                    replace: true,
                });
            } catch (error) {
                console.error(
                    "사용자 정보 조회 실패:",
                    error.response?.status,
                    error.response?.data ??
                    error.message
                );

                localStorage.removeItem(
                    "accessToken"
                );

                navigate("/login", {
                    replace: true,
                    state: {
                        errorMessage:
                            "로그인 처리 중 오류가 발생했습니다.",
                    },
                });
            }
        };

        handleOAuthSuccess();
    }, [navigate, searchParams]);

    return (
        <main className="oauth-success-page">
            <div className="oauth-success-loading">
                <div
                    className="oauth-success-spinner"
                    aria-hidden="true"
                />

                <p>
                    로그인 정보를 확인하고 있습니다.
                </p>
            </div>
        </main>
    );
}

export default OAuthSuccessPage;