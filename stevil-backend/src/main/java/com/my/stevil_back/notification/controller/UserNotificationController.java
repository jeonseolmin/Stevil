package com.my.stevil_back.notification.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.notification.dto.request.DeviceTokenDeleteRequest;
import com.my.stevil_back.notification.dto.request.DeviceTokenRequest;
import com.my.stevil_back.notification.dto.response.NotificationResponse;
import com.my.stevil_back.notification.dto.response.ReadAllResponse;
import com.my.stevil_back.notification.dto.response.UnreadCountResponse;
import com.my.stevil_back.notification.service.UserDeviceService;
import com.my.stevil_back.notification.service.UserNotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/*
 * 로그인 사용자의 알림/기기 API. 사용자는 항상 인증 정보(@AuthenticationPrincipal)에서 가져오며
 * 요청 본문이나 경로로 userId 를 받지 않는다.
 */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class UserNotificationController {

    private final UserNotificationService notificationService;
    private final UserDeviceService deviceService;

    @PostMapping("/token")
    public ResponseEntity<Void> registerToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DeviceTokenRequest request,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent
    ) {
        deviceService.register(userDetails.getUserId(), request.token(), request.platform(), userAgent);

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/token")
    public ResponseEntity<Void> unregisterToken(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody DeviceTokenDeleteRequest request
    ) {
        deviceService.unregister(userDetails.getUserId(), request.token());

        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                notificationService.list(userDetails.getUserId(), unreadOnly, page, size)
        );
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                new UnreadCountResponse(notificationService.unreadCount(userDetails.getUserId()))
        );
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                notificationService.markRead(userDetails.getUserId(), id)
        );
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ReadAllResponse> markAllRead(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                new ReadAllResponse(notificationService.markAllRead(userDetails.getUserId()))
        );
    }
}
