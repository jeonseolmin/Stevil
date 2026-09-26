package com.my.stevil_back.notification;

import com.my.stevil_back.notification.dto.response.NotificationResponse;
import com.my.stevil_back.notification.entity.Notification;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.json.JsonMapper;

import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

/* 저장된 LocalDateTime(JVM 기본 시간대 기준)을 offset 이 붙은 시각으로 내려주는지 확인한다. */
class NotificationResponseTest {

    @Test
    void timestampsCarryTheOffsetTheyWereWrittenIn() {
        User user = User.builder().email("a@example.com").nickname("a").role(UserRole.ROLE_USER).build();
        Notification notification = Notification.create(user, NotificationType.REMINDER, "제목", "내용", "/weight");
        LocalDateTime created = LocalDateTime.of(2026, 9, 26, 4, 48, 29);
        ReflectionTestUtils.setField(notification, "createdAt", created);

        NotificationResponse response = NotificationResponse.from(notification);

        assertThat(response.createdAt().toLocalDateTime()).isEqualTo(created);
        assertThat(response.createdAt().getOffset())
                .isEqualTo(ZoneId.systemDefault().getRules().getOffset(created));
        assertThat(response.readAt()).isNull();

        String json = JsonMapper.builder().build().writeValueAsString(response);
        assertThat(json).containsPattern("\"createdAt\":\"2026-09-26T04:48:29(Z|[+-]\\d{2}:\\d{2})\"");
    }
}
