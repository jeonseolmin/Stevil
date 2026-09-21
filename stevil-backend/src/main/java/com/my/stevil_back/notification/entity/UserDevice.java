package com.my.stevil_back.notification.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/*
 * 사용자의 푸시 수신 기기. 한 사용자가 여러 기기를 가질 수 있고, FCM 토큰은 전체에서 유일하다.
 * 같은 토큰이 다른 사용자로 다시 등록되면 소유자를 이전한다(assignTo).
 */
@Entity
@Table(
        name = "user_devices",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_devices_fcm_token", columnNames = "fcm_token"),
        indexes = @Index(name = "idx_user_devices_user_last_used", columnList = "user_id, last_used_at")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserDevice extends BaseEntity {

    public static final int FCM_TOKEN_MAX_LENGTH = 1024;
    public static final int USER_AGENT_MAX_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "fcm_token", nullable = false, length = FCM_TOKEN_MAX_LENGTH)
    private String fcmToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DevicePlatform platform;

    @Column(name = "user_agent", length = USER_AGENT_MAX_LENGTH)
    private String userAgent;

    @Column(name = "last_used_at", nullable = false)
    private LocalDateTime lastUsedAt;

    private UserDevice(User user, String fcmToken, DevicePlatform platform, String userAgent, LocalDateTime now) {
        this.user = user;
        this.fcmToken = fcmToken;
        this.platform = platform;
        this.userAgent = abbreviate(userAgent);
        this.lastUsedAt = now;
    }

    public static UserDevice create(
            User user,
            String fcmToken,
            DevicePlatform platform,
            String userAgent,
            LocalDateTime now
    ) {
        if (fcmToken == null || fcmToken.isBlank() || fcmToken.length() > FCM_TOKEN_MAX_LENGTH) {
            throw new IllegalArgumentException("FCM 토큰 형식이 올바르지 않습니다.");
        }

        return new UserDevice(user, fcmToken, platform, userAgent, now);
    }

    /** 같은 토큰이 다시 등록될 때: 소유자(다른 사용자일 수 있음)·기기 정보·마지막 사용 시각을 갱신한다. */
    public void assignTo(User user, DevicePlatform platform, String userAgent, LocalDateTime now) {
        this.user = user;
        this.platform = platform;
        this.userAgent = abbreviate(userAgent);
        this.lastUsedAt = now;
    }

    /** CR/LF 등 제어 문자를 제거하고 길이를 제한한다(로그·화면 표시 안전). */
    static String abbreviate(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }

        String cleaned = userAgent.replaceAll("\\p{Cntrl}", " ").strip();

        return cleaned.length() > USER_AGENT_MAX_LENGTH
                ? cleaned.substring(0, USER_AGENT_MAX_LENGTH)
                : cleaned;
    }
}
