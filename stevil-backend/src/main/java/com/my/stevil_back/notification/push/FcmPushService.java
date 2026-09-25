package com.my.stevil_back.notification.push;

import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.SendResponse;
import com.my.stevil_back.notification.service.UserDeviceService;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/*
 * Firebase Admin SDK 로 실제 FCM 을 보내는 PushSender. FirebaseConfig 가 설정이 정상일 때만 이 구현을 bean 으로 만든다.
 *
 *  - 토큰을 500개(FCM multicast 상한) 단위로 나눠 sendEachForMulticast 로 보낸다.
 *  - 재시도는 하지 않는다. 일시 오류는 WARN 만 남기고 토큰을 유지한다.
 *  - 토큰을 지우는 것은 UNREGISTERED / SENDER_ID_MISMATCH 뿐이다(FcmErrorClassifier 참고).
 *  - 로그에는 마스킹한 토큰과 오류 코드만 남긴다. 예외 메시지 본문은 남기지 않는다.
 *
 * 호출자(NotificationPushListener)가 모든 예외를 잡으므로 여기서 던진 예외도 알림 저장에는 영향이 없다.
 */
@Slf4j
public class FcmPushService implements PushSender {

    static final int MAX_TOKENS_PER_BATCH = 500;

    private final FirebaseMessaging messaging;
    private final UserDeviceService userDeviceService;

    public FcmPushService(FirebaseMessaging messaging, UserDeviceService userDeviceService) {
        this.messaging = messaging;
        this.userDeviceService = userDeviceService;
    }

    @Override
    public void send(PushPayload payload) {
        List<String> tokens = payload.deviceTokens();

        for (int from = 0; from < tokens.size(); from += MAX_TOKENS_PER_BATCH) {
            List<String> chunk = tokens.subList(from, Math.min(from + MAX_TOKENS_PER_BATCH, tokens.size()));
            sendChunk(payload, chunk);
        }
    }

    private void sendChunk(PushPayload payload, List<String> chunk) {
        BatchResponse response;

        try {
            response = messaging.sendEachForMulticast(buildMessage(payload, chunk));
        } catch (FirebaseMessagingException e) {
            // 요청 전체가 실패한 경우(인증, 네트워크 등). 토큰은 건드리지 않는다.
            FcmErrorClassifier.Failure failure = FcmErrorClassifier.classify(e);
            String detail = FcmErrorClassifier.describe(e);

            if (failure == FcmErrorClassifier.Failure.AUTH_CONFIG) {
                log.error("FCM send failed (auth/config): notificationId={}, userId={}, tokens={}, error={}",
                        payload.notificationId(), payload.userId(), chunk.size(), detail);
            } else {
                log.warn("FCM send failed ({}): notificationId={}, userId={}, tokens={}, error={}",
                        failure, payload.notificationId(), payload.userId(), chunk.size(), detail);
            }
            return;
        }

        handleResponse(payload, chunk, response);
    }

    private void handleResponse(PushPayload payload, List<String> chunk, BatchResponse response) {
        List<SendResponse> results = response.getResponses();
        List<String> invalidTokens = new ArrayList<>();
        Map<FcmErrorClassifier.Failure, Integer> failures = new EnumMap<>(FcmErrorClassifier.Failure.class);

        for (int i = 0; i < results.size() && i < chunk.size(); i++) {
            SendResponse result = results.get(i);

            if (result.isSuccessful()) {
                continue;
            }

            FirebaseMessagingException error = result.getException();
            FcmErrorClassifier.Failure failure = FcmErrorClassifier.classify(error);
            failures.merge(failure, 1, Integer::sum);

            switch (failure) {
                case INVALID_TOKEN -> invalidTokens.add(chunk.get(i));
                case INVALID_ARGUMENT -> log.warn("FCM invalid argument (token kept): notificationId={}, token={}, error={}",
                        payload.notificationId(), TokenMasker.mask(chunk.get(i)), FcmErrorClassifier.describe(error));
                case AUTH_CONFIG -> log.error("FCM auth/config error (token kept): notificationId={}, token={}, error={}",
                        payload.notificationId(), TokenMasker.mask(chunk.get(i)), FcmErrorClassifier.describe(error));
                default -> log.warn("FCM send failed ({}, token kept): notificationId={}, token={}, error={}",
                        failure, payload.notificationId(), TokenMasker.mask(chunk.get(i)), FcmErrorClassifier.describe(error));
            }
        }

        int removed = removeInvalidTokens(payload, invalidTokens);

        log.info("FCM sent: notificationId={}, userId={}, tokens={}, success={}, failure={}, failureKinds={}, removedTokens={}",
                payload.notificationId(), payload.userId(), chunk.size(),
                response.getSuccessCount(), response.getFailureCount(), failures, removed);
    }

    /** 삭제 실패는 전송 결과에 영향을 주지 않는다. 소유자가 바뀐 토큰은 userId 조건 때문에 지워지지 않는다. */
    private int removeInvalidTokens(PushPayload payload, List<String> invalidTokens) {
        if (invalidTokens.isEmpty()) {
            return 0;
        }

        try {
            return userDeviceService.removeInvalidTokens(payload.userId(), invalidTokens);
        } catch (Exception e) {
            log.warn("Invalid token cleanup failed: userId={}, tokens={}, error={}",
                    payload.userId(), invalidTokens.size(), e.getClass().getSimpleName());
            return 0;
        }
    }

    /** notification(title/body) + data(notificationId, targetUrl). targetUrl 은 PR-A 에서 내부 경로로 검증된 값이다. */
    static MulticastMessage buildMessage(PushPayload payload, List<String> tokens) {
        MulticastMessage.Builder builder = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(Notification.builder()
                        .setTitle(payload.title())
                        .setBody(payload.body())
                        .build())
                .putData("notificationId", String.valueOf(payload.notificationId()));

        if (payload.targetUrl() != null) {
            builder.putData("targetUrl", payload.targetUrl());
        }

        return builder.build();
    }
}
