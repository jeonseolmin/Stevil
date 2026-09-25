import { releasePush } from "../firebase/messaging";

/*
 * 명시적 로그아웃 공통 처리. JWT 가 살아 있을 때 푸시 토큰을 먼저 해제하고(best-effort, 최대 1.5초),
 * 그 다음 로컬 인증 정보를 지운다. 401 자동 로그아웃 경로는 JWT 가 이미 무효라 여기를 쓰지 않는다.
 */
export async function logout() {
    await Promise.race([
        releasePush().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);

    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");
}
