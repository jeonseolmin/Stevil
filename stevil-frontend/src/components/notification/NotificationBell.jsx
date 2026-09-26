import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchUnreadCount } from "../../api/notificationApi";
import { IconBell } from "../icons/Icons.jsx";
import "./NotificationBell.css";

const POLL_MS = 60000;
const DEBOUNCE_MS = 1000;

/*
 * 헤더 알림 벨 + 안 읽은 개수. 60초 폴링, 창 포커스, 화면 이동, 읽음 처리 이벤트,
 * 서비스 워커의 push 수신 메시지에서 다시 센다(여러 트리거가 몰리면 1초 debounce).
 */
export default function NotificationBell() {
    const [count, setCount] = useState(0);
    const location = useLocation();
    const timer = useRef(null);

    const refresh = useCallback(() => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            fetchUnreadCount().then(setCount).catch(() => {});
        }, DEBOUNCE_MS);
    }, []);

    useEffect(() => {
        fetchUnreadCount().then(setCount).catch(() => {});
        const interval = setInterval(refresh, POLL_MS);
        const onSwMessage = (event) => {
            if (event.data?.type === "stevil-push") {
                refresh();
            }
        };
        window.addEventListener("focus", refresh);
        window.addEventListener("notifications:changed", refresh);
        navigator.serviceWorker?.addEventListener("message", onSwMessage);
        return () => {
            clearInterval(interval);
            clearTimeout(timer.current);
            window.removeEventListener("focus", refresh);
            window.removeEventListener("notifications:changed", refresh);
            navigator.serviceWorker?.removeEventListener("message", onSwMessage);
        };
    }, [refresh]);

    useEffect(() => {
        refresh();
    }, [location.pathname, refresh]);

    const label = count > 0 ? `알림 ${count}개 안 읽음` : "알림";

    return (
        <Link to="/notifications" className="notification-bell" aria-label={label} title={label}>
            <IconBell width={22} height={22} />
            {count > 0 && <span className="notification-bell__badge">{count > 99 ? "99+" : count}</span>}
        </Link>
    );
}
