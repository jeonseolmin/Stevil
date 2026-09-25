package com.my.stevil_back.notification.service;

import com.my.stevil_back.notification.entity.UserDevice;
import com.my.stevil_back.notification.entity.enumType.DevicePlatform;
import com.my.stevil_back.notification.push.TokenMasker;
import com.my.stevil_back.notification.repository.UserDeviceRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/*
 * 사용자 기기(FCM 토큰) 등록/해제.
 *
 * 정책
 *  - 같은 토큰이 다시 등록되면 lastUsedAt 을 갱신한다.
 *  - 같은 토큰이 다른 사용자로 등록되면 소유자를 이전한다(마지막 로그인 사용자가 가져간다).
 *  - 사용자당 기기는 최대 MAX_DEVICES_PER_USER 개이며, 넘으면 lastUsedAt 이 가장 오래된 기기부터 삭제한다.
 *  - 해제는 본인 소유 토큰만 지우고, 없거나 남의 것이면 조용히 무시한다(로그아웃 흐름이 실패하지 않도록).
 *
 * 동시성: fcm_token 유니크 제약이 최종 방어선이다. 같은 새 토큰이 동시에 두 번 등록되면 한쪽 insert 가 제약 위반으로
 * 실패하고 그 트랜잭션은 사용할 수 없게 되므로(PostgreSQL), 등록 한 번을 독립 트랜잭션(REQUIRES_NEW)으로 실행하고
 * 제약 위반이면 새 트랜잭션에서 다시 시도한다(이때는 이미 존재하는 행을 갱신하게 된다).
 */
@Slf4j
@Service
public class UserDeviceService {

    public static final int MAX_DEVICES_PER_USER = 10;
    private static final int MAX_REGISTER_ATTEMPTS = 3;

    private final UserDeviceRepository userDeviceRepository;
    private final UserRepository userRepository;
    private final TransactionTemplate registerTransaction;

    public UserDeviceService(
            UserDeviceRepository userDeviceRepository,
            UserRepository userRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.userDeviceRepository = userDeviceRepository;
        this.userRepository = userRepository;
        this.registerTransaction = new TransactionTemplate(transactionManager);
        this.registerTransaction.setPropagationBehavior(TransactionTemplate.PROPAGATION_REQUIRES_NEW);
    }

    /**
     * FCM 이 영구 무효(UNREGISTERED 등)로 알린 토큰을 지운다. userId 조건 때문에, 그 사이 다른 사용자에게 소유권이 넘어간 토큰은 지워지지 않는다.
     * 푸시 스레드(트랜잭션 없음)에서 호출되므로 자체 트랜잭션을 연다. 지운 행 수를 돌려준다.
     */
    @Transactional
    public int removeInvalidTokens(Long userId, java.util.Collection<String> tokens) {
        int removed = 0;

        for (String token : tokens) {
            removed += userDeviceRepository.deleteByFcmTokenAndUserId(token, userId);
        }

        log.info("Removed invalid device tokens: userId={}, requested={}, removed={}", userId, tokens.size(), removed);

        return removed;
    }

    /** 이 메서드 자체는 트랜잭션을 열지 않는다 — 시도마다 독립 트랜잭션을 쓴다. */
    public void register(Long userId, String token, DevicePlatform platform, String userAgent) {
        for (int attempt = 1; ; attempt++) {
            try {
                registerTransaction.executeWithoutResult(
                        status -> registerOnce(userId, token, platform, userAgent)
                );
                return;
            } catch (DataIntegrityViolationException e) {
                if (attempt >= MAX_REGISTER_ATTEMPTS) {
                    throw e;
                }

                log.debug("Device token insert raced (attempt {}), retrying: token={}",
                        attempt, TokenMasker.mask(token));
            }
        }
    }

    @Transactional
    public boolean unregister(Long userId, String token) {
        int deleted = userDeviceRepository.deleteByFcmTokenAndUserId(token, userId);

        if (deleted > 0) {
            log.info("Device unregistered: userId={}, token={}", userId, TokenMasker.mask(token));
        }

        return deleted > 0;
    }

    private void registerOnce(Long userId, String token, DevicePlatform platform, String userAgent) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
        LocalDateTime now = LocalDateTime.now();

        UserDevice existing = userDeviceRepository.findByFcmToken(token).orElse(null);

        if (existing != null) {
            boolean transferred = !existing.getUser().getId().equals(userId);
            existing.assignTo(user, platform, userAgent, now);

            if (transferred) {
                log.info("Device token ownership transferred to userId={}, token={}", userId, TokenMasker.mask(token));
            }
        } else {
            // flush 로 유니크 제약 위반을 이 트랜잭션 안에서 바로 드러낸다(→ register 가 재시도).
            userDeviceRepository.saveAndFlush(UserDevice.create(user, token, platform, userAgent, now));
        }

        enforceDeviceLimit(userId, token);
    }

    /*
     * 방금 등록한 기기는 지우지 않고, 나머지 중 lastUsedAt 이 오래된 순서로 초과분을 지운다.
     * 여러 요청이 동시에 같은 기기를 지우려 해도 벌크 삭제라 예외 없이 지나간다.
     */
    private void enforceDeviceLimit(Long userId, String keepToken) {
        List<UserDevice> devices = userDeviceRepository.findByUserIdOrderByLastUsedAtAscIdAsc(userId);
        int excess = devices.size() - MAX_DEVICES_PER_USER;

        if (excess <= 0) {
            return;
        }

        List<Long> removeIds = new ArrayList<>();

        for (UserDevice device : devices) {
            if (removeIds.size() >= excess) {
                break;
            }
            if (keepToken.equals(device.getFcmToken())) {
                continue;
            }
            removeIds.add(device.getId());
        }

        userDeviceRepository.deleteAllByIdInBatch(removeIds);
        log.info("Removed {} least-recently-used device(s) over the limit: userId={}", removeIds.size(), userId);
    }
}
