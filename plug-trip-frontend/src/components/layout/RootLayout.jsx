import { Outlet } from "react-router-dom";
import Header from "../header/Header";

export default function RootLayout() {
    return (
        <>
            <Header />

            <main>
                <Outlet />
            </main>
        </>
    );
}