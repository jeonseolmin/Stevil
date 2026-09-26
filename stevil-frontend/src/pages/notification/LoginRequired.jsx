import { Link } from "react-router-dom";
import "./notification.css";

/* 로그인하지 않은 상태로 알림/리마인더 페이지에 들어왔을 때 보여 준다. */
export default function LoginRequired({ title }) {
    return (
        <div className="noti-page">
            <div className="noti-container">
                <div className="noti-header">
                    <h1>{title}</h1>
                </div>
                <p className="noti-empty">로그인하면 알림과 알림 시간을 관리할 수 있어요.</p>
                <Link to="/login" className="noti-button noti-button--primary noti-login">로그인하기</Link>
            </div>
        </div>
    );
}
