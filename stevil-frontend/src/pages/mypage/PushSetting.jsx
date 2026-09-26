import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { enablePush, getPushStatus, syncPushToken, watchPushPermission } from "../../firebase/messaging";

// iOS Safari 는 홈 화면에 추가한 앱(standalone)에서만 웹 푸시를 지원한다(iOS 16.4+).
const isIos = () =>
    /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

const IOS_INSTALL_HINT =
    "iPhone에서는 Safari의 공유 버튼 → '홈 화면에 추가' 후, 홈 화면의 Stevil 앱에서 알림을 켤 수 있어요. (iOS 16.4 이상)";

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
    const [waiting, setWaiting] = useState(false);
    const busyRef = useRef(false);

    // 주소창에서 권한을 바꾸면 새로고침 없이 반영한다. granted 로 바뀌면 등록까지 한다.
    // "알림 켜기" 진행 중에는 그 흐름이 끝을 책임지므로 여기서 건드리지 않는다.
    useEffect(() => {
        let alive = true;
        let last = null;
        const refresh = async () => {
            if (busyRef.current) {
                return;
            }
            const value = await getPushStatus();
            if (!alive) {
                return;
            }
            if (value === "granted" && last !== null && last !== "granted") {
                await syncPushToken();
            }
            last = value;
            setStatus(value);
            if (value !== "default") {
                setError("");
            }
        };
        refresh();
        const stop = watchPushPermission(refresh);
        return () => {
            alive = false;
            stop();
        };
    }, []);

    if (!status || status === "unconfigured") {
        return null;
    }

    const handleEnable = async () => {
        busyRef.current = true;
        setBusy(true);
        setWaiting(false);
        setError("");
        try {
            const result = await enablePush(() => setWaiting(true));
            if (result === "timeout") {
                setError("알림 요청에 응답이 없어요. 주소창의 알림 요청(종 아이콘)에서 허용한 뒤 다시 눌러 주세요.");
            } else {
                setStatus(result);
            }
        } catch {
            setError("알림을 켜지 못했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            busyRef.current = false;
            setBusy(false);
            setWaiting(false);
        }
    };

    return (
        <>
            <hr className="mypage-divider" />
            <div className="mypage-section">
                <h3>푸시 알림</h3>
                <p><Link to="/reminders">알림 시간 설정</Link> · <Link to="/notifications">받은 알림 보기</Link></p>
                {status === "default" ? (
                    <button type="button" className="edit-btn" onClick={handleEnable} disabled={busy}>
                        {busy ? "설정 중..." : "알림 켜기"}
                    </button>
                ) : (
                    <p>{status === "unsupported" && isIos() && !isStandalone() ? IOS_INSTALL_HINT : MESSAGES[status]}</p>
                )}
                {busy && waiting && (
                    <p role="status">브라우저 주소창의 알림 요청(종 아이콘)을 확인해 주세요.</p>
                )}
                {error && <p role="alert">{error}</p>}
            </div>
        </>
    );
}
