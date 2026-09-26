import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    notifyNotificationsChanged,
} from "../../api/notificationApi";
import "./notification.css";

const PAGE_SIZE = 20;

function formatTime(value) {
    if (!value) {
        return "";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* 알림 목록. 항목을 누르면 읽음 처리 후 targetUrl(앱 내부 경로)로 이동한다. */
export default function NotificationsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [last, setLast] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        fetchNotifications(0, PAGE_SIZE)
            .then((data) => {
                if (!alive) {
                    return;
                }
                setItems(data.content || []);
                setLast(data.last !== false);
            })
            .catch(() => alive && setError("알림을 불러오지 못했어요."))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, []);

    const loadMore = async () => {
        const next = page + 1;
        try {
            const data = await fetchNotifications(next, PAGE_SIZE);
            setItems((prev) => [...prev, ...(data.content || [])]);
            setLast(data.last !== false);
            setPage(next);
        } catch {
            setError("알림을 더 불러오지 못했어요.");
        }
    };

    const open = async (item) => {
        if (!item.read) {
            try {
                await markNotificationRead(item.id);
                notifyNotificationsChanged();
            } catch {
                // 읽음 처리가 실패해도 이동은 한다.
            }
        }
        if (item.targetUrl && item.targetUrl.startsWith("/") && !item.targetUrl.startsWith("//")) {
            navigate(item.targetUrl);
        } else {
            setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
        }
    };

    const readAll = async () => {
        try {
            await markAllNotificationsRead();
            setItems((prev) => prev.map((n) => ({ ...n, read: true })));
            notifyNotificationsChanged();
        } catch {
            setError("모두 읽음 처리에 실패했어요.");
        }
    };

    const hasUnread = items.some((n) => !n.read);

    return (
        <div className="noti-page">
            <div className="noti-container">
                <div className="noti-header">
                    <h1>알림</h1>
                    <div className="noti-header__actions">
                        <Link to="/reminders" className="noti-link">알림 시간 설정</Link>
                        <button type="button" className="noti-button" onClick={readAll} disabled={!hasUnread}>
                            모두 읽음
                        </button>
                    </div>
                </div>

                {error && <p className="noti-error" role="alert">{error}</p>}

                {loading ? (
                    <p className="noti-empty">불러오는 중...</p>
                ) : items.length === 0 ? (
                    <p className="noti-empty">아직 받은 알림이 없어요.</p>
                ) : (
                    <ul className="noti-list">
                        {items.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    className={`noti-item ${item.read ? "" : "noti-item--unread"}`}
                                    onClick={() => open(item)}
                                >
                                    <span className="noti-item__title">{item.title}</span>
                                    <span className="noti-item__body">{item.body}</span>
                                    <span className="noti-item__time">{formatTime(item.createdAt)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {!loading && !last && (
                    <button type="button" className="noti-button noti-more" onClick={loadMore}>
                        더 보기
                    </button>
                )}
            </div>
        </div>
    );
}
