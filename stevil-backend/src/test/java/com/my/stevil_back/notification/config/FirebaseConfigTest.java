package com.my.stevil_back.notification.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.my.stevil_back.notification.push.FcmPushService;
import com.my.stevil_back.notification.push.NoopPushSender;
import com.my.stevil_back.notification.push.PushSender;
import com.my.stevil_back.notification.service.UserDeviceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/*
 * PushSender 선택/강등 정책과 credential 비노출을 검증한다. 실제 Firebase 네트워크 호출은 없다.
 * 실제 service-account 키는 쓰지 않고, 테스트 안에서 만든 임시 RSA 키로 가짜 JSON 을 만든다.
 */
class FirebaseConfigTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(FirebaseConfig.class)
            .withBean(UserDeviceService.class, () -> mock(UserDeviceService.class));

    private ListAppender<ILoggingEvent> logs;
    private Logger logger;

    @BeforeEach
    void captureLogs() {
        logger = (Logger) LoggerFactory.getLogger(FirebaseConfig.class);
        logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
    }

    @AfterEach
    void releaseLogs() {
        logger.detachAppender(logs);
    }

    private String logText() {
        return logs.list.stream().map(ILoggingEvent::getFormattedMessage).collect(Collectors.joining("\n"));
    }

    private boolean loggedAt(Level level) {
        return logs.list.stream().anyMatch(e -> e.getLevel() == level);
    }

    /** 가짜(테스트용으로 방금 생성한) RSA 키로 service-account 형식의 JSON 을 만든다. */
    static Path fakeServiceAccount(Path dir, String privateKeyMarker) throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair pair = gen.generateKeyPair();
        String pem = "-----BEGIN PRIVATE KEY-----\\n"
                + Base64.getEncoder().encodeToString(pair.getPrivate().getEncoded()) + "\\n-----END PRIVATE KEY-----\\n";
        String json = "{\"type\":\"service_account\",\"project_id\":\"stevil-test-project\","
                + "\"private_key_id\":\"" + privateKeyMarker + "\",\"private_key\":\"" + pem + "\","
                + "\"client_email\":\"fcm-test@stevil-test-project.iam.gserviceaccount.com\","
                + "\"client_id\":\"123\",\"token_uri\":\"https://oauth2.googleapis.com/token\"}";
        Path file = dir.resolve("fake-sa.json");
        Files.writeString(file, json, StandardCharsets.UTF_8);
        return file;
    }

    @Test
    void disabledUsesNoopAndLogsDisabled() {
        runner.run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(ctx.getBean(PushSender.class)).isInstanceOf(NoopPushSender.class);
        });
        assertThat(logText()).contains("FCM push: DISABLED");
        assertThat(loggedAt(Level.ERROR)).isFalse();
    }

    @Test
    void enabledWithValidCredentialUsesFcmAndLogsProjectIdOnly(@TempDir Path dir) throws Exception {
        Path file = fakeServiceAccount(dir, "KEYID-MARKER-123");

        runner.withPropertyValues("stevil.firebase.enabled=true", "stevil.firebase.credentials-path=" + file)
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    assertThat(ctx.getBean(PushSender.class)).isInstanceOf(FcmPushService.class);
                });

        assertThat(logText()).contains("FCM push: ENABLED (projectId=stevil-test-project)");
        assertThat(logText()).doesNotContain("KEYID-MARKER-123").doesNotContain("PRIVATE KEY").doesNotContain("iam.gserviceaccount");
    }

    @Test
    void enabledWithMissingPathFallsBackToNoopAndStartsNormally() {
        runner.withPropertyValues("stevil.firebase.enabled=true").run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(ctx.getBean(PushSender.class)).isInstanceOf(NoopPushSender.class);
        });
        assertThat(loggedAt(Level.ERROR)).isTrue();
        assertThat(logText()).contains("FCM push: FAILED").contains("falling back to NoopPushSender");
    }

    @Test
    void enabledWithMissingFileFallsBackToNoop(@TempDir Path dir) {
        runner.withPropertyValues("stevil.firebase.enabled=true",
                "stevil.firebase.credentials-path=" + dir.resolve("nope.json")).run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(ctx.getBean(PushSender.class)).isInstanceOf(NoopPushSender.class);
        });
        assertThat(logText()).contains("FCM push: FAILED").contains("missing or not readable");
    }

    @Test
    void enabledWithEmptyPlaceholderFileFallsBackToNoop(@TempDir Path dir) throws Exception {
        Path placeholder = Files.createFile(dir.resolve("placeholder"));

        runner.withPropertyValues("stevil.firebase.enabled=true", "stevil.firebase.credentials-path=" + placeholder)
                .run(ctx -> assertThat(ctx.getBean(PushSender.class)).isInstanceOf(NoopPushSender.class));
        assertThat(logText()).contains("FCM push: FAILED").contains("empty");
    }

    @Test
    void corruptedCredentialFallsBackToNoopWithoutLeakingContent(@TempDir Path dir) throws Exception {
        Path bad = dir.resolve("bad.json");
        Files.writeString(bad, "{\"type\":\"service_account\",\"private_key\":\"SECRET-CONTENT-MARKER\",\"project_id\":", StandardCharsets.UTF_8);

        runner.withPropertyValues("stevil.firebase.enabled=true", "stevil.firebase.credentials-path=" + bad).run(ctx -> {
            assertThat(ctx).hasNotFailed();
            assertThat(ctx.getBean(PushSender.class)).isInstanceOf(NoopPushSender.class);
        });

        assertThat(loggedAt(Level.ERROR)).isTrue();
        assertThat(logText()).doesNotContain("SECRET-CONTENT-MARKER");
        assertThat(logs.list).allSatisfy(e -> assertThat(e.getThrowableProxy()).isNull());
    }

    @Test
    void wrongCredentialTypeFallsBackToNoop(@TempDir Path dir) throws Exception {
        Path notServiceAccount = dir.resolve("user.json");
        Files.writeString(notServiceAccount,
                "{\"type\":\"authorized_user\",\"client_id\":\"c\",\"client_secret\":\"SECRET-CONTENT-MARKER\",\"refresh_token\":\"r\"}",
                StandardCharsets.UTF_8);

        runner.withPropertyValues("stevil.firebase.enabled=true", "stevil.firebase.credentials-path=" + notServiceAccount)
                .run(ctx -> assertThat(ctx.getBean(PushSender.class)).isInstanceOf(NoopPushSender.class));
        assertThat(logText()).doesNotContain("SECRET-CONTENT-MARKER");
    }
}
