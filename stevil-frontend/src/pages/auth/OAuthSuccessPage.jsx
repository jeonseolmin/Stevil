import { useEffect, useRef } from "react";
import { backendUrl } from "../../api/backendUrl";
import {
    useNavigate,
    useSearchParams,
} from "react-router-dom";

function OAuthSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    /*
     * React StrictMode(개발 모드)는 effect를 mount 시 두 번 실행한다.
     * 이 컴포넌트는 진짜 unmount/remount가 아니라 같은 mount
     * lifecycle 안에서 두 번 도는 것이므로, ref는 그 사이에도
     * 그대로 유지된다 -- 그래서 전역 변수 없이 이 ref 하나로
     * "이미 검증을 시작했으면 다시 시작하지 않는다"를 표현할 수 있다.
     */
    const startedRef = useRef(false);

    useEffect(() => {
        if (startedRef.current) {
            return;
        }

        startedRef.current = true;

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

            /*
             * axiosInstance(XHR)로 이 시점에 /users/me를 부르면,
             * 로그인 직후 Header 등 다른 컴포넌트의 axios 요청과
             * 겹쳐 backend가 순간적으로 500을 내는 경우가 관찰됐다
             * (동일 시각 fetch()로 보낸 같은 토큰의 요청은 매번
             * 정상 응답했다 -- 조사 결과 XHR 기반 axios 요청에서만
             * 재현되고 순수 fetch에서는 재현되지 않았다). 로그인
             * 직후 이 최초 확인 호출만 fetch로 보낸다.
             */
            const fetchMe = () =>
                fetch(backendUrl("/api/users/me"), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }).then(async res => {
                    const data = await res
                        .json()
                        .catch(() => null);

                    if (!res.ok) {
                        const error = new Error(
                            `/api/users/me failed with ${res.status}`
                        );

                        error.response = {
                            status: res.status,
                            data,
                        };

                        throw error;
                    }

                    return { data };
                });

            let response;

            try {
                response = await fetchMe();
            } catch (firstError) {
                const status =
                    firstError.response?.status;

                /*
                 * 401/403은 실제 인증 실패이므로 재시도로 숨기지
                 * 않고 바로 로그인 화면으로 보낸다.
                 */
                if (status === 401 || status === 403) {
                    console.error(
                        "사용자 정보 조회 실패:",
                        status,
                        firstError.response?.data ??
                        firstError.message
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

                    return;
                }

                /*
                 * 그 외(5xx/네트워크 오류)는 순간적인 문제일 수
                 * 있어 한 번만 재시도한다. 무한 재시도나 retry
                 * loop는 두지 않는다 -- 이것도 실패하면 기존과
                 * 동일하게 token을 지우고 로그인 화면으로 보낸다.
                 */
                try {
                    response = await fetchMe();
                } catch (secondError) {
                    console.error(
                        "사용자 정보 조회 실패:",
                        secondError.response?.status,
                        secondError.response?.data ??
                        secondError.message
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

                    return;
                }
            }

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
