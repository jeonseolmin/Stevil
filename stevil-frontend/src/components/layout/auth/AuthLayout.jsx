import { Link, Outlet } from "react-router-dom";
import "./AuthLayout.css";

export default function AuthLayout() {
    return (
        <div className="auth-layout">
            <header className="auth-header">
<<<<<<< HEAD
                <Link
                    to="/"
                    className="auth-logo"
                    aria-label="Stevil 홈으로 이동"
                >
                    <span className="auth-brand-symbol" aria-hidden="true">
                        1
                    </span>
                    <span className="auth-brand-name">
                        Stevil
                    </span>
                </Link>
=======
            <Link
                to="/"
                className="auth-logo"
                aria-label="Stevil 홈으로 이동"
            >
                Stevil
            </Link>
>>>>>>> 72a74fbd90ffd7829ad6b6c4aa7e3f417a105c1c
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
