import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance, {
    clearAccessToken,
    setAccessToken,
} from "../../api/axiosInstance";


function OAuthSuccessPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleOAuthSuccess = async () => {
            try {
                /*
                 * OAuth2SuccessHandler에서 이미
                 * HttpOnly Refresh Cookie를 발급했습니다.
                 *
                 * 이제 그 Cookie를 이용해서
                 * Access Token을 받아옵니다.
                 */
                const tokenResponse =
                    await axiosInstance.post(
                        "/auth/refresh"
                    );

                const accessToken =
                    tokenResponse.data.accessToken;

                if (!accessToken) {
                    throw new Error(
                        "Access Token이 없습니다."
                    );
                }


                setAccessToken(accessToken);

                const userResponse =
                    await axiosInstance.get(
                        "/users/me"
                    );

                const user =
                    userResponse.data;

                localStorage.setItem(
                    "userRole",
                    user.role
                );

                /*
                 * 관리자
                 */
                if (
                    user.role ===
                    "ROLE_ADMIN"
                ) {
                    navigate(
                        "/admin",
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                /*
                 * 일반 사용자
                 */
                if (
                    user.onboardingCompleted
                ) {
                    navigate(
                        "/dashboard",
                        {
                            replace: true,
                        }
                    );

                    return;
                }

                /*
                 * 온보딩 미완료 사용자
                 */
                navigate(
                    "/onboarding",
                    {
                        replace: true,
                    }
                );

            } catch (error) {
                console.error(
                    "OAuth 로그인 후 인증 처리 실패:",
                    error.response?.status,
                    error.response?.data ??
                    error.message
                );

                clearAccessToken();

                localStorage.removeItem(
                    "userRole"
                );

                navigate(
                    "/login",
                    {
                        replace: true,
                        state: {
                            errorMessage:
                                "로그인 처리 중 오류가 발생했습니다.",
                        },
                    }
                );
            }
        };

        handleOAuthSuccess();

    }, [navigate]);

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