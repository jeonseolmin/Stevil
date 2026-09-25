import { useEffect, useState } from "react";
import { enablePush, getPushStatus } from "../../firebase/messaging";

const MESSAGES = {
    unsupported: "이 브라우저에서는 푸시 알림을 사용할 수 없습니다.",
    denied: "알림이 차단되어 있습니다. 브라우저 사이트 설정에서 알림을 허용해 주세요.",
    granted: "이 기기에서 푸시 알림을 받고 있습니다.",
};

/* 사용자가 버튼을 눌렀을 때만 알림 권한을 요청한다. Firebase 설정이 없는 빌드에서는 아무것도 그리지 않는다. */
export default function PushSetting() {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let alive = true;
        getPushStatus().then((value) => alive && setStatus(value));
        return () => {
            alive = false;
        };
    }, []);

    if (!status || status === "unconfigured") {
        return null;
    }

    const handleEnable = async () => {
        setBusy(true);
        setError("");
        try {
            setStatus(await enablePush());
        } catch {
            setError("알림을 켜지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <hr className="mypage-divider" />
            <div className="mypage-section">
                <h3>푸시 알림</h3>
                {status === "default" ? (
                    <button type="button" className="edit-btn" onClick={handleEnable} disabled={busy}>
                        {busy ? "설정 중..." : "알림 켜기"}
                    </button>
                ) : (
                    <p>{MESSAGES[status]}</p>
                )}
                {error && <p role="alert">{error}</p>}
            </div>
        </>
    );
}
