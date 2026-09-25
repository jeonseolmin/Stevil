package com.my.stevil_back.notification.push;

import com.google.firebase.ErrorCode;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;

/*
 * FCM 전송 실패를 처리 방침별로 분류한다. 토큰을 지워도 되는 것은 INVALID_TOKEN 뿐이다.
 *
 *  - INVALID_TOKEN    : UNREGISTERED, SENDER_ID_MISMATCH → 토큰 자체가 더는 쓸 수 없다. 삭제 대상.
 *  - INVALID_ARGUMENT : 토큰 오류인지 payload 오류인지 알 수 없으므로 삭제하지 않는다(WARN 만).
 *  - AUTH_CONFIG      : 인증/권한/설정 오류. 토큰과 무관하므로 삭제하지 않는다(ERROR).
 *  - TRANSIENT        : 할당량/일시 장애/네트워크. 토큰 유지, 재시도 없음(WARN).
 *  - UNKNOWN          : 그 외. 토큰 유지.
 */
public final class FcmErrorClassifier {

    public enum Failure {
        INVALID_TOKEN, INVALID_ARGUMENT, AUTH_CONFIG, TRANSIENT, UNKNOWN
    }

    private FcmErrorClassifier() {
    }

    public static Failure classify(FirebaseMessagingException e) {
        if (e == null) {
            return Failure.UNKNOWN;
        }

        MessagingErrorCode messagingCode = e.getMessagingErrorCode();

        // SENDER_ID_MISMATCH 의 HTTP 계열 코드는 PERMISSION_DENIED 이므로 FCM 전용 코드를 먼저 본다.
        if (messagingCode == MessagingErrorCode.UNREGISTERED || messagingCode == MessagingErrorCode.SENDER_ID_MISMATCH) {
            return Failure.INVALID_TOKEN;
        }
        if (messagingCode == MessagingErrorCode.INVALID_ARGUMENT) {
            return Failure.INVALID_ARGUMENT;
        }
        if (messagingCode == MessagingErrorCode.THIRD_PARTY_AUTH_ERROR) {
            return Failure.AUTH_CONFIG;
        }
        if (messagingCode == MessagingErrorCode.QUOTA_EXCEEDED
                || messagingCode == MessagingErrorCode.UNAVAILABLE
                || messagingCode == MessagingErrorCode.INTERNAL) {
            return Failure.TRANSIENT;
        }

        ErrorCode code = e.getErrorCode();

        if (code == ErrorCode.UNAUTHENTICATED || code == ErrorCode.PERMISSION_DENIED) {
            return Failure.AUTH_CONFIG;
        }
        if (code == ErrorCode.INVALID_ARGUMENT) {
            return Failure.INVALID_ARGUMENT;
        }
        if (code == ErrorCode.RESOURCE_EXHAUSTED
                || code == ErrorCode.UNAVAILABLE
                || code == ErrorCode.INTERNAL
                || code == ErrorCode.DEADLINE_EXCEEDED
                || code == ErrorCode.UNKNOWN) {
            return Failure.TRANSIENT;
        }

        return Failure.UNKNOWN;
    }

    /** 로그용 코드 이름. 메시지 본문은 남기지 않는다. */
    public static String describe(FirebaseMessagingException e) {
        if (e == null) {
            return "null";
        }

        MessagingErrorCode messagingCode = e.getMessagingErrorCode();
        ErrorCode code = e.getErrorCode();

        return (messagingCode != null ? messagingCode.name() : "-") + "/" + (code != null ? code.name() : "-");
    }
}
