import { NavLink } from "react-router-dom";

export default function Header() {
    return (
        <header>
            <NavLink to="/">PLUG·TRIP</NavLink>

            <nav>
                <NavLink to="/explore">여행 탐색</NavLink>
                <NavLink to="/planner">AI 여행 만들기</NavLink>
                <NavLink to="/my-trips">내 여행</NavLink>
            </nav>

            <NavLink to="/login">로그인</NavLink>
        </header>
    );
}