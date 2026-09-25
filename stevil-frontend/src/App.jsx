import { useEffect } from "react";
import AppRouter from "./routes/AppRouter";
import { syncPushToken } from "./firebase/messaging";

export default function App() {
    // 이미 알림을 허용한 로그인 사용자의 FCM 토큰을 백엔드와 맞춘다(권한 요청 없음, 설정 없으면 no-op).
    useEffect(() => {
        syncPushToken();
    }, []);

    return <AppRouter />;
}
