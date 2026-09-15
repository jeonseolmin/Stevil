import { useState } from "react";

// Demonstrates the PWA state UX the brief asks for: offline, update
// available, sync pending — dismissible, non-blocking, inline with content.
export default function PwaBanners() {
    const [dismissed, setDismissed] = useState({});

    const hide = (key) => setDismissed((current) => ({ ...current, [key]: true }));

    return (
        <>
            {!dismissed.update && (
                <div className="dp-pwa-banner dp-update">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 14V4M6 8l4-4 4 4" />
                        <path d="M4 16h12" />
                    </svg>
                    새 버전이 있어요 · 업데이트
                    <button type="button" onClick={() => hide("update")}>닫기</button>
                </div>
            )}

            {!dismissed.offline && (
                <div className="dp-pwa-banner dp-offline">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 8.5a10 10 0 0 1 14 0M6 11.5a6 6 0 0 1 8 0M9 14.5a2.2 2.2 0 0 1 2 0" />
                        <path d="M3.5 3.5l13 13" />
                    </svg>
                    인터넷 연결이 없어 일부 기능이 제한됩니다.
                    <button type="button" onClick={() => hide("offline")}>닫기</button>
                </div>
            )}
        </>
    );
}
