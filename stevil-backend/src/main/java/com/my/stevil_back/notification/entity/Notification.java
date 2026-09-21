package com.my.stevil_back.notification.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
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
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/*
 * 사용자 알림. PostgreSQL의 이 테이블이 알림의 source of truth 이고 FCM 푸시는 전달 수단일 뿐이다.
 * 읽음 여부는 readAt 으로만 표현한다(readAt == null 이면 미읽음).
 */
@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_notifications_user_read", columnList = "user_id, read_at")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification extends BaseEntity {

    public static final int TITLE_MAX_LENGTH = 100;
    public static final int BODY_MAX_LENGTH = 500;
    public static final int TARGET_URL_MAX_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = TITLE_MAX_LENGTH)
    private String title;

    @Column(nullable = false, length = BODY_MAX_LENGTH)
    private String body;

    @Column(name = "target_url", length = TARGET_URL_MAX_LENGTH)
    private String targetUrl;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    private Notification(User user, NotificationType type, String title, String body, String targetUrl) {
        this.user = user;
        this.type = type;
        this.title = title;
        this.body = body;
        this.targetUrl = targetUrl;
    }

    /** 검증에 실패하면 IllegalArgumentException 을 던진다(내부 호출자의 프로그래밍 오류). */
    public static Notification create(
            User user,
            NotificationType type,
            String title,
            String body,
            String targetUrl
    ) {
        if (user == null) {
            throw new IllegalArgumentException("알림 대상 사용자가 필요합니다.");
        }
        if (type == null) {
            throw new IllegalArgumentException("알림 유형이 필요합니다.");
        }

        return new Notification(
                user,
                type,
                requireText(title, "제목", TITLE_MAX_LENGTH),
                requireText(body, "내용", BODY_MAX_LENGTH),
                validateTargetUrl(targetUrl)
        );
    }

    public boolean isRead() {
        return readAt != null;
    }

    /** 이미 읽은 알림이면 아무것도 하지 않는다(멱등, 최초 읽음 시각 유지). 새로 읽음 처리했으면 true. */
    public boolean markRead(LocalDateTime now) {
        if (readAt != null) {
            return false;
        }

        this.readAt = now;
        return true;
    }

    /*
     * targetUrl 은 null 또는 앱 내부 상대 경로("/"로 시작)만 허용한다.
     * 외부 URL, 프로토콜 상대 URL("//host"), 백슬래시("/\host"는 브라우저가 "//"로 해석), 공백/제어문자는 거부한다.
     */
    public static String validateTargetUrl(String targetUrl) {
        if (targetUrl == null) {
            return null;
        }

        if (targetUrl.length() > TARGET_URL_MAX_LENGTH) {
            throw new IllegalArgumentException("이동 경로가 너무 깁니다.");
        }

        if (!targetUrl.startsWith("/")
                || targetUrl.startsWith("//")
                || targetUrl.indexOf('\\') >= 0) {
            throw new IllegalArgumentException("이동 경로는 앱 내부 경로('/'로 시작)만 허용됩니다.");
        }

        for (int i = 0; i < targetUrl.length(); i++) {
            char ch = targetUrl.charAt(i);
            if (Character.isISOControl(ch) || Character.isWhitespace(ch)) {
                throw new IllegalArgumentException("이동 경로에 공백이나 제어 문자를 사용할 수 없습니다.");
            }
        }

        return targetUrl;
    }

    private static String requireText(String value, String label, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + "은(는) 비어 있을 수 없습니다.");
        }
        if (value.length() > maxLength) {
            throw new IllegalArgumentException(label + "은(는) " + maxLength + "자를 넘을 수 없습니다.");
        }

        return value;
    }
}
