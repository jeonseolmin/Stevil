import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function OAuthSuccessPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
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

        /*
         * 다음 단계에서 /api/users/me를 조회하여
         * 온보딩 완료 여부에 따라 이동하도록 변경합니다.
         */
        navigate("/onboarding", { replace: true });
    }, [navigate, searchParams]);

    return (
        <main className="oauth-success-page">
            <p>로그인 정보를 확인하고 있습니다.</p>
        </main>
    );
}

export default OAuthSuccessPage;