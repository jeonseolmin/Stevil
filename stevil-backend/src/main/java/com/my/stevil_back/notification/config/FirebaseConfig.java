package com.my.stevil_back.notification.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.my.stevil_back.notification.push.FcmPushService;
import com.my.stevil_back.notification.push.NoopPushSender;
import com.my.stevil_back.notification.push.PushSender;
import com.my.stevil_back.notification.service.UserDeviceService;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;

/*
 * PushSender bean 을 고른다. 항상 정확히 하나만 만들어지며, 설정 문제로 backend 가 기동에 실패하는 일은 없다.
 *
 *  - stevil.firebase.enabled=false                → NoopPushSender   (로그: "FCM push: DISABLED")
 *  - enabled=true + credential 정상               → FcmPushService   (로그: "FCM push: ENABLED (projectId=...)")
 *  - enabled=true + credential 누락/손상/초기화 실패 → NoopPushSender 로 강등 (로그: ERROR "FCM push: FAILED ...")
 *
 * 로그에는 실패 사유(이 클래스가 정한 고정 문구), 예외 클래스명, projectId 만 남긴다.
 * credential 파일 내용/private key/예외 메시지(파일 조각이 섞일 수 있음)는 남기지 않는다.
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(FirebaseProperties.class)
public class FirebaseConfig {

    static final String APP_NAME = "stevil-fcm";
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS = 10_000;

    private FirebaseApp app;
    private String projectId = "unknown";

    @Bean
    public PushSender pushSender(FirebaseProperties properties, UserDeviceService userDeviceService) {
        if (!properties.enabled()) {
            log.info("FCM push: DISABLED (stevil.firebase.enabled=false) -> NoopPushSender, no push will be delivered");
            return new NoopPushSender();
        }

        try {
            FirebaseMessaging messaging = initMessaging(properties.credentialsPath());
            log.info("FCM push: ENABLED (projectId={}) -> FcmPushService", projectId);
            return new FcmPushService(messaging, userDeviceService);
        } catch (InitFailure e) {
            log.error("FCM push: FAILED to initialize although stevil.firebase.enabled=true -> falling back to "
                            + "NoopPushSender, push notifications are NOT being delivered. reason={}, error={}",
                    e.reason, e.causeName());
        } catch (Exception | LinkageError e) {
            log.error("FCM push: FAILED to initialize although stevil.firebase.enabled=true -> falling back to "
                            + "NoopPushSender, push notifications are NOT being delivered. reason=unexpected, error={}",
                    e.getClass().getSimpleName());
        }

        return new NoopPushSender();
    }

    /** 패키지 공개는 테스트용. 실패는 모두 InitFailure(고정 사유 문구)로만 나간다. */
    FirebaseMessaging initMessaging(String credentialsPath) throws InitFailure {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            throw new InitFailure("credentials path is not configured (FIREBASE_CREDENTIALS_PATH)", null);
        }

        Path path = Path.of(credentialsPath);

        if (!Files.isRegularFile(path) || !Files.isReadable(path)) {
            throw new InitFailure("credentials file is missing or not readable", null);
        }

        try {
            if (Files.size(path) == 0) {
                throw new InitFailure("credentials file is empty (placeholder, key not installed)", null);
            }

            GoogleCredentials credentials;
            try (InputStream in = Files.newInputStream(path)) {
                credentials = GoogleCredentials.fromStream(in);
            }

            if (!(credentials instanceof ServiceAccountCredentials serviceAccount)) {
                throw new InitFailure("credentials are not a service-account key", null);
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(serviceAccount)
                    .setConnectTimeout(CONNECT_TIMEOUT_MS)
                    .setReadTimeout(READ_TIMEOUT_MS)
                    .build();

            FirebaseApp existing = FirebaseApp.getApps().stream()
                    .filter(a -> APP_NAME.equals(a.getName()))
                    .findFirst()
                    .orElse(null);

            app = existing != null ? existing : FirebaseApp.initializeApp(options, APP_NAME);
            projectId = serviceAccount.getProjectId() != null ? serviceAccount.getProjectId() : "unknown";

            return FirebaseMessaging.getInstance(app);
        } catch (IOException e) {
            throw new InitFailure("credentials file is invalid or unreadable", e);
        } catch (RuntimeException e) {
            throw new InitFailure("Firebase initialization failed", e);
        }
    }

    @PreDestroy
    void close() {
        if (app != null) {
            try {
                app.delete();
            } catch (RuntimeException ignored) {
                // 종료 중 정리 실패는 무시한다.
            }
        }
    }

    static final class InitFailure extends Exception {
        final String reason;
        private final String causeName;

        InitFailure(String reason, Throwable cause) {
            super(reason);
            this.reason = reason;
            this.causeName = cause != null ? cause.getClass().getSimpleName() : "-";
        }

        String causeName() {
            return causeName;
        }
    }
}
