import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../header/Header";
import BottomNav from "./BottomNav";
import "./BottomNav.css";

export default function RootLayout() {
    const location = useLocation();

    const [isLoggedIn, setIsLoggedIn] = useState(() =>
        Boolean(localStorage.getItem("accessToken"))
    );

    useEffect(() => {
        setIsLoggedIn(Boolean(localStorage.getItem("accessToken")));
    }, [location.pathname]);

    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === "accessToken") {
                setIsLoggedIn(Boolean(event.newValue));
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    return (
        <>
            <Header />

            <main className={isLoggedIn ? "has-bottom-nav" : ""}>
                <Outlet />
            </main>

            {isLoggedIn && <BottomNav />}
        </>
    );
}