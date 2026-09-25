/*
 * FCM 웹 푸시 서비스 워커. Firebase SDK 없이 표준 push 이벤트만 처리한다.
 * 백엔드(FcmPushService)는 notification{title, body} + data{notificationId, targetUrl} 을 보낸다.
 *
 * 알림 클릭 시에는 같은 origin 의 앱 내부 경로("/..." 단, "//" 와 "\" 제외)만 연다.
 * 백엔드도 targetUrl 을 검증하지만 여기서 한 번 더 막는다(defense-in-depth).
 */

function safeTargetUrl(value) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
        return "/";
    }
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.href : "/";
}

self.addEventListener("push", (event) => {
    let payload;
    try {
        payload = event.data ? event.data.json() : {};
    } catch {
        return;
    }

    const notification = payload.notification || {};
    const data = payload.data || {};

    event.waitUntil(
        self.registration.showNotification(notification.title || "Stevil", {
            body: notification.body || "",
            icon: "/favicon.svg",
            tag: data.notificationId ? `notification-${data.notificationId}` : undefined,
            data: { targetUrl: safeTargetUrl(data.targetUrl) },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = safeTargetUrl(event.notification.data && event.notification.data.targetUrl);

    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
        if (existing) {
            await existing.focus();
            return existing.navigate(target);
        }
        return self.clients.openWindow(target);
    })());
});
