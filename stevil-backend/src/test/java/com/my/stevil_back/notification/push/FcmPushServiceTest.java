package com.my.stevil_back.notification.push;

import com.google.firebase.ErrorCode;
import com.google.firebase.messaging.BatchResponse;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.MulticastMessage;
import com.google.firebase.messaging.SendResponse;
import com.my.stevil_back.notification.service.UserDeviceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/* Firebase 네트워크 호출 없이 FirebaseMessaging 을 mock 으로 대체해 전송/오류 처리를 검증한다. */
class FcmPushServiceTest {

    private FirebaseMessaging messaging;
    private UserDeviceService devices;
    private FcmPushService service;

    @BeforeEach
    void setUp() {
        messaging = mock(FirebaseMessaging.class);
        devices = mock(UserDeviceService.class);
        service = new FcmPushService(messaging, devices);
    }

    /** 인자(mock 생성)가 먼저 평가되도록 별도 메서드에서 스텁한다 — when() 안에서 mock 을 만들면 UnfinishedStubbing 이 난다. */
    private void returning(BatchResponse response) throws Exception {
        when(messaging.sendEachForMulticast(any(MulticastMessage.class))).thenReturn(response);
    }

    static PushPayload payload(String targetUrl, List<String> tokens) {
        return new PushPayload(11L, 5L, "제목", "내용", targetUrl, tokens);
    }

    static SendResponse ok() {
        SendResponse r = mock(SendResponse.class);
        when(r.isSuccessful()).thenReturn(true);
        return r;
    }

    static SendResponse fail(MessagingErrorCode messagingCode, ErrorCode code) {
        FirebaseMessagingException e = mock(FirebaseMessagingException.class);
        when(e.getMessagingErrorCode()).thenReturn(messagingCode);
        when(e.getErrorCode()).thenReturn(code);
        SendResponse r = mock(SendResponse.class);
        when(r.isSuccessful()).thenReturn(false);
        when(r.getException()).thenReturn(e);
        return r;
    }

    static BatchResponse batch(SendResponse... responses) {
        BatchResponse b = mock(BatchResponse.class);
        List<SendResponse> list = List.of(responses);
        when(b.getResponses()).thenReturn(list);
        long success = list.stream().filter(SendResponse::isSuccessful).count();
        when(b.getSuccessCount()).thenReturn((int) success);
        when(b.getFailureCount()).thenReturn((int) (list.size() - success));
        return b;
    }

    @Test
    void successSendsNotificationAndDataWithoutCleanup() throws Exception {
        returning(batch(ok()));

        service.send(payload("/community/1", List.of("tok-1")));

        ArgumentCaptor<MulticastMessage> captor = ArgumentCaptor.forClass(MulticastMessage.class);
        verify(messaging).sendEachForMulticast(captor.capture());
        MulticastMessage sent = captor.getValue();

        assertThat((List<String>) ReflectionTestUtils.getField(sent, "tokens")).containsExactly("tok-1");
        Object notification = ReflectionTestUtils.getField(sent, "notification");
        assertThat(ReflectionTestUtils.getField(notification, "title")).isEqualTo("제목");
        assertThat(ReflectionTestUtils.getField(notification, "body")).isEqualTo("내용");
        assertThat((Map<String, String>) ReflectionTestUtils.getField(sent, "data"))
                .containsEntry("notificationId", "11").containsEntry("targetUrl", "/community/1");
        verify(devices, never()).removeInvalidTokens(any(), anyCollection());
    }

    @Test
    void targetUrlIsOmittedFromDataWhenNull() throws Exception {
        returning(batch(ok()));

        service.send(payload(null, List.of("tok-1")));

        ArgumentCaptor<MulticastMessage> captor = ArgumentCaptor.forClass(MulticastMessage.class);
        verify(messaging).sendEachForMulticast(captor.capture());
        assertThat((Map<String, String>) ReflectionTestUtils.getField(captor.getValue(), "data"))
                .containsOnlyKeys("notificationId");
    }

    @Test
    void multipleTokensAreSentInOneMulticast() throws Exception {
        returning(batch(ok(), ok(), ok()));

        service.send(payload(null, List.of("a", "b", "c")));

        ArgumentCaptor<MulticastMessage> captor = ArgumentCaptor.forClass(MulticastMessage.class);
        verify(messaging, times(1)).sendEachForMulticast(captor.capture());
        assertThat((List<String>) ReflectionTestUtils.getField(captor.getValue(), "tokens")).containsExactly("a", "b", "c");
    }

    @Test
    void moreThan500TokensAreChunked() throws Exception {
        List<String> tokens = IntStream.range(0, 1201).mapToObj(i -> "t" + i).toList();
        when(messaging.sendEachForMulticast(any(MulticastMessage.class))).thenAnswer(inv -> {
            MulticastMessage m = inv.getArgument(0);
            int size = ((List<?>) ReflectionTestUtils.getField(m, "tokens")).size();
            SendResponse[] all = new SendResponse[size];
            for (int i = 0; i < size; i++) all[i] = ok();
            return batch(all);
        });

        service.send(payload(null, tokens));

        ArgumentCaptor<MulticastMessage> captor = ArgumentCaptor.forClass(MulticastMessage.class);
        verify(messaging, times(3)).sendEachForMulticast(captor.capture());
        List<Integer> sizes = new ArrayList<>();
        for (MulticastMessage m : captor.getAllValues()) {
            sizes.add(((List<?>) ReflectionTestUtils.getField(m, "tokens")).size());
        }
        assertThat(sizes).containsExactly(500, 500, 201);
    }

    @Test
    void unregisteredAndSenderIdMismatchTokensAreRemovedByOwner() throws Exception {
        returning(batch(
                fail(MessagingErrorCode.UNREGISTERED, ErrorCode.NOT_FOUND),
                ok(),
                fail(MessagingErrorCode.SENDER_ID_MISMATCH, ErrorCode.PERMISSION_DENIED)));

        service.send(payload(null, List.of("dead", "good", "mismatch")));

        ArgumentCaptor<List<String>> removed = ArgumentCaptor.forClass(List.class);
        verify(devices).removeInvalidTokens(eq(5L), removed.capture());
        assertThat(removed.getValue()).containsExactly("dead", "mismatch");
    }

    @Test
    void otherFailuresKeepTheToken() throws Exception {
        returning(batch(
                fail(MessagingErrorCode.INVALID_ARGUMENT, ErrorCode.INVALID_ARGUMENT),
                fail(null, ErrorCode.UNAUTHENTICATED),
                fail(null, ErrorCode.PERMISSION_DENIED),
                fail(MessagingErrorCode.THIRD_PARTY_AUTH_ERROR, ErrorCode.UNAUTHENTICATED),
                fail(MessagingErrorCode.QUOTA_EXCEEDED, ErrorCode.RESOURCE_EXHAUSTED),
                fail(MessagingErrorCode.UNAVAILABLE, ErrorCode.UNAVAILABLE),
                fail(MessagingErrorCode.INTERNAL, ErrorCode.INTERNAL),
                fail(null, ErrorCode.UNKNOWN),
                ok()));

        service.send(payload(null, List.of("a", "b", "c", "d", "e", "f", "g", "h", "i")));

        verify(devices, never()).removeInvalidTokens(any(), anyCollection());
    }

    @Test
    void invalidArgumentDoesNotDeleteEvenWhenOtherTokensSucceed() throws Exception {
        returning(batch(
                ok(), fail(MessagingErrorCode.INVALID_ARGUMENT, ErrorCode.INVALID_ARGUMENT)));

        service.send(payload(null, List.of("good", "bad")));

        verify(devices, never()).removeInvalidTokens(any(), anyCollection());
    }

    @Test
    void wholeRequestFailureDoesNotThrowAndKeepsTokens() throws Exception {
        FirebaseMessagingException e = mock(FirebaseMessagingException.class);
        when(e.getMessagingErrorCode()).thenReturn(null);
        when(e.getErrorCode()).thenReturn(ErrorCode.UNAVAILABLE);
        when(messaging.sendEachForMulticast(any(MulticastMessage.class))).thenThrow(e);

        assertThatCode(() -> service.send(payload(null, List.of("a")))).doesNotThrowAnyException();
        verify(devices, never()).removeInvalidTokens(any(), anyCollection());
    }

    @Test
    void cleanupFailureDoesNotBreakSend() throws Exception {
        returning(batch(
                fail(MessagingErrorCode.UNREGISTERED, ErrorCode.NOT_FOUND)));
        when(devices.removeInvalidTokens(any(), anyCollection())).thenThrow(new IllegalStateException("db down"));

        assertThatCode(() -> service.send(payload(null, List.of("dead")))).doesNotThrowAnyException();
    }
}
