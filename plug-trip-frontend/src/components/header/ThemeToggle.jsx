import useTheme from "../../hooks/useTheme";
import "./ThemeToggle.css";

export default function ThemeToggle() {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
                isDarkMode
                    ? "라이트 모드로 변경"
                    : "다크 모드로 변경"
            }
            title={
                isDarkMode
                    ? "라이트 모드로 변경"
                    : "다크 모드로 변경"
            }
        >
            {isDarkMode ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
                </svg>
            )}
        </button>
    );
}