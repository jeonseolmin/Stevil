package com.my.stevil_back.notification.push;

import com.google.firebase.ErrorCode;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.my.stevil_back.notification.push.FcmErrorClassifier.Failure;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FcmErrorClassifierTest {

    private static Failure classify(MessagingErrorCode messagingCode, ErrorCode code) {
        FirebaseMessagingException e = mock(FirebaseMessagingException.class);
        when(e.getMessagingErrorCode()).thenReturn(messagingCode);
        when(e.getErrorCode()).thenReturn(code);
        return FcmErrorClassifier.classify(e);
    }

    @Test
    void onlyUnregisteredAndSenderIdMismatchAreInvalidTokens() {
        assertThat(classify(MessagingErrorCode.UNREGISTERED, ErrorCode.NOT_FOUND)).isEqualTo(Failure.INVALID_TOKEN);
        // HTTP 계열 코드가 PERMISSION_DENIED 여도 FCM 전용 코드가 우선한다.
        assertThat(classify(MessagingErrorCode.SENDER_ID_MISMATCH, ErrorCode.PERMISSION_DENIED)).isEqualTo(Failure.INVALID_TOKEN);
    }

    @Test
    void invalidArgumentIsNotAnInvalidToken() {
        assertThat(classify(MessagingErrorCode.INVALID_ARGUMENT, ErrorCode.INVALID_ARGUMENT)).isEqualTo(Failure.INVALID_ARGUMENT);
        assertThat(classify(null, ErrorCode.INVALID_ARGUMENT)).isEqualTo(Failure.INVALID_ARGUMENT);
    }

    @Test
    void authAndConfigErrors() {
        assertThat(classify(null, ErrorCode.UNAUTHENTICATED)).isEqualTo(Failure.AUTH_CONFIG);
        assertThat(classify(null, ErrorCode.PERMISSION_DENIED)).isEqualTo(Failure.AUTH_CONFIG);
        assertThat(classify(MessagingErrorCode.THIRD_PARTY_AUTH_ERROR, ErrorCode.UNAUTHENTICATED)).isEqualTo(Failure.AUTH_CONFIG);
    }

    @Test
    void transientErrors() {
        assertThat(classify(MessagingErrorCode.QUOTA_EXCEEDED, ErrorCode.RESOURCE_EXHAUSTED)).isEqualTo(Failure.TRANSIENT);
        assertThat(classify(MessagingErrorCode.UNAVAILABLE, ErrorCode.UNAVAILABLE)).isEqualTo(Failure.TRANSIENT);
        assertThat(classify(MessagingErrorCode.INTERNAL, ErrorCode.INTERNAL)).isEqualTo(Failure.TRANSIENT);
        assertThat(classify(null, ErrorCode.DEADLINE_EXCEEDED)).isEqualTo(Failure.TRANSIENT);
        assertThat(classify(null, ErrorCode.UNKNOWN)).isEqualTo(Failure.TRANSIENT);
    }

    @Test
    void nullAndUnrecognizedAreUnknown() {
        assertThat(FcmErrorClassifier.classify(null)).isEqualTo(Failure.UNKNOWN);
        assertThat(classify(null, ErrorCode.NOT_FOUND)).isEqualTo(Failure.UNKNOWN);
        assertThat(classify(null, null)).isEqualTo(Failure.UNKNOWN);
    }
}
