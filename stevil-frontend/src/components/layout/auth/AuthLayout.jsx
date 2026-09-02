import { Link, Outlet } from "react-router-dom";
import "./AuthLayout.css";

export default function AuthLayout() {
    return (
        <div className="auth-layout">
            <header className="auth-header">
            <Link
                to="/"
                className="auth-logo"
                aria-label="Stevil 홈으로 이동"
            >
                Stevil
            </Link>
            </header>

            <main className="auth-content">
                <Outlet />
            </main>

            <p className="auth-footer">
                건강한 변화를 위한 첫걸음, Stevil
            </p>
        </div>
    );
}
