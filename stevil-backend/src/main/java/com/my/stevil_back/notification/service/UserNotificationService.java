package com.my.stevil_back.notification.service;

import com.my.stevil_back.notification.dto.response.NotificationResponse;
import com.my.stevil_back.notification.entity.Notification;
import com.my.stevil_back.notification.entity.enumType.NotificationType;
import com.my.stevil_back.notification.event.NotificationCreatedEvent;
import com.my.stevil_back.notification.repository.NotificationRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

/*
 * 사용자 알림 저장/조회/읽음 처리. (기존 common.notification.service.NotificationService 는 피드백 요청을
 * Kakao/이메일로 보내는 별개 서비스이므로 건드리지 않는다.)
 */
@Service
@RequiredArgsConstructor
public class UserNotificationService {

    public static final int MAX_PAGE_SIZE = 100;

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /*
     * 알림을 저장하고 이벤트를 발행한다. 이벤트는 이 트랜잭션이 커밋된 뒤에만(AFTER_COMMIT) 리스너에 전달되므로,
     * 푸시 전송이 커밋 전에 실행되거나 롤백된 알림에 대해 실행되는 일이 없다.
     * 반드시 이 메서드의 @Transactional 안에서 발행한다 — 트랜잭션 밖에서 발행한 이벤트는 AFTER_COMMIT 리스너가 무시한다.
     */
    @Transactional
    public NotificationResponse create(
            Long userId,
            NotificationType type,
            String title,
            String body,
            String targetUrl
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("알림 대상 사용자를 찾을 수 없습니다."));

        Notification saved = notificationRepository.save(
                Notification.create(user, type, title, body, targetUrl)
        );

        eventPublisher.publishEvent(new NotificationCreatedEvent(saved.getId(), userId));

        return NotificationResponse.from(saved);
    }

    /** 최신순(createdAt desc, id desc). 클라이언트가 정렬을 지정할 수 없게 서버에서 고정한다. */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(Long userId, boolean unreadOnly, int page, int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        Page<Notification> result = unreadOnly
                ? notificationRepository.findUnreadPageByUserId(userId, pageable)
                : notificationRepository.findPageByUserId(userId, pageable);

        return result.map(NotificationResponse::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    /** 본인 알림만. 없거나 남의 알림이면 404(존재 여부를 알려 주지 않는다). 이미 읽었으면 그대로 돌려준다(멱등). */
    @Transactional
    public NotificationResponse markRead(Long userId, Long notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."));

        notification.markRead(LocalDateTime.now());

        return NotificationResponse.from(notification);
    }

    /** 새로 읽음 처리된 건수를 돌려준다. */
    @Transactional
    public int markAllRead(Long userId) {
        return notificationRepository.markAllRead(userId, LocalDateTime.now());
    }
}
