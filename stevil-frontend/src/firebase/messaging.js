import { registerDeviceToken, unregisterDeviceToken } from "../api/notificationApi";

/*
 * 웹 푸시(FCM) 등록 수명 주기. Firebase Installation ID(FID) 기반 register()/onRegistered()/unregister() 를 쓴다
 * (getToken()/deleteToken() 은 firebase 12 에서 deprecated). 백엔드 /api/notifications/token 에는 FID 를 등록한다.
 *
 *  - Firebase Web config / VAPID 는 브라우저용 공개 값이며 VITE_FIREBASE_* 로 빌드 시 주입한다.
 *    값이 없으면 이 모듈 전체가 no-op 이고 앱은 그대로 동작한다.
 *  - 권한 요청은 사용자가 버튼을 눌렀을 때만(enablePush) 한다. 자동 프롬프트 금지.
 *  - 서비스 워커(/firebase-messaging-sw.js)는 Firebase SDK 없이 push 이벤트만 처리하므로 설정값을 넘기지 않는다.
 *  - firebase 모듈은 실제로 켤 때만 동적 import 해 첫 화면 번들에 넣지 않는다.
 */

const env = import.meta.env;

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
};
const vapidKey = env.VITE_FIREBASE_VAPID_KEY;

const SW_URL = "/firebase-messaging-sw.js";
const FID_KEY = "fcmFid";

export const isPushConfigured = () =>
    Boolean(vapidKey && firebaseConfig.apiKey && firebaseConfig.projectId
        && firebaseConfig.messagingSenderId && firebaseConfig.appId);

let messagingPromise = null;

async function getMessagingIfSupported() {
    if (!isPushConfigured() || !("serviceWorker" in navigator) || !("Notification" in window)) {
        return null;
    }
    if (!messagingPromise) {
        messagingPromise = (async () => {
            const [{ initializeApp, getApps }, messaging] = await Promise.all([
                import("firebase/app"),
                import("firebase/messaging"),
            ]);
            if (!(await messaging.isSupported())) {
                return null;
            }
            const app = getApps()[0] || initializeApp(firebaseConfig);
            const instance = messaging.getMessaging(app);
            const result = { module: messaging, instance, lastUpload: null };
            // register() 완료 때마다, 그리고 FID 가 바뀌면 SDK 가 호출한다. 받은 FID 를 백엔드에 올린다.
            messaging.onRegistered(instance, (fid) => {
                result.lastUpload = registerDeviceToken(fid).then(() => localStorage.setItem(FID_KEY, fid));
                result.lastUpload.catch(() => {});
            });
            return result;
        })().catch(() => null);
    }
    return messagingPromise;
}

/** "unconfigured" | "unsupported" | "default" | "denied" | "granted" */
export async function getPushStatus() {
    if (!isPushConfigured()) {
        return "unconfigured";
    }
    if (!(await getMessagingIfSupported())) {
        return "unsupported";
    }
    return Notification.permission;
}

/**
 * 사용자 클릭에서만 호출한다. 권한 요청 -> 서비스 워커 등록 -> FCM register(FID) -> 백엔드 등록.
 * 결과 상태 문자열을 돌려준다(getPushStatus 와 같은 값). 실패는 예외로 던진다.
 */
export async function enablePush() {
    const messaging = await getMessagingIfSupported();
    if (!messaging) {
        return isPushConfigured() ? "unsupported" : "unconfigured";
    }

    // denied 면 브라우저가 다시 묻지 않는다. 설정에서 직접 허용해야 한다.
    const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") {
        return permission;
    }

    await registerFid(messaging);
    return "granted";
}

/*
 * 앱 시작 시(로그인 상태) 호출한다. 이미 granted 인 경우에만 register() 해 현재 FID 를 백엔드에 다시 등록한다.
 * FID 가 같아도 매번 등록한다: 401 자동 로그아웃처럼 해제하지 못한 채 다른 사용자가 로그인한 경우
 * 소유권이 이전되고(PR-A), lastUsedAt 도 갱신된다. 권한은 절대 묻지 않고, 실패는 조용히 무시한다.
 */
export async function syncPushToken() {
    try {
        if (!localStorage.getItem("accessToken")) {
            return;
        }
        const messaging = await getMessagingIfSupported();
        if (!messaging || Notification.permission !== "granted") {
            return;
        }
        await registerFid(messaging);
    } catch {
        // 다음 앱 시작 때 다시 시도한다.
    }
}

const REGISTER_TIMEOUT_MS = 20000;

/*
 * register() 는 onRegistered 를 동기로 호출하므로, 끝난 뒤 그 업로드를 기다리면 백엔드 등록까지 완료된다.
 * register() 는 getToken() 과 달리 서비스 워커 활성화를 기다리지 않으므로, 활성화된 registration(ready)을 넘긴다.
 * 어느 단계든 멈추면 UI 가 "설정 중"에 갇히지 않도록 전체에 타임아웃을 둔다.
 */
async function registerFid(messaging) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("FCM registration timed out")), REGISTER_TIMEOUT_MS);
    });

    try {
        await Promise.race([timeout, (async () => {
            await navigator.serviceWorker.register(SW_URL);
            const registration = await navigator.serviceWorker.ready;
            messaging.lastUpload = null;
            await messaging.module.register(messaging.instance, {
                vapidKey,
                serviceWorkerRegistration: registration,
            });
            if (!messaging.lastUpload) {
                throw new Error("FCM registration did not report an FID");
            }
            await messaging.lastUpload;
        })()]);
    } catch (error) {
        console.warn("Push registration failed:", error?.code || error?.name, error?.message);
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

/*
 * 명시적 로그아웃에서 JWT 를 지우기 전에 호출한다. 백엔드 해제와 FCM unregister() 를 병렬 best-effort 로
 * 실행하며 실패해도 로그아웃을 막지 않는다.
 */
export async function releasePush() {
    const fid = localStorage.getItem(FID_KEY);
    localStorage.removeItem(FID_KEY);
    if (!fid) {
        return;
    }

    // onUnregistered 는 쓰지 않는다: 그 시점엔 JWT 가 없을 수 있으므로 백엔드 해제는 여기서 직접 한다.
    await Promise.allSettled([
        unregisterDeviceToken(fid),
        getMessagingIfSupported().then((messaging) => messaging && messaging.module.unregister(messaging.instance)),
    ]);
}
