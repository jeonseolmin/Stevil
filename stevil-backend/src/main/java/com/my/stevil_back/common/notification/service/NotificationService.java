package com.my.stevil_back.common.notification.service;

import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.auth.social.repository.SocialAccountRepository;
import com.my.stevil_back.common.email.service.EmailService;
import com.my.stevil_back.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final SocialAccountRepository socialAccountRepository;
    private final EmailService emailService;
    private final KakaoMessageService kakaoMessageService;

    @Transactional(readOnly = true)
    public void sendFeedbackRequest(User user) {
        List<SocialAccount> accounts = socialAccountRepository.findAllByUserId(user.getId());

        SocialAccount kakaoAccount = accounts.stream()
                .filter(account -> account.getProvider() == ProviderType.KAKAO)
                .findFirst()
                .orElse(null);

        // 카카오 계정이고 토큰이 DB에 있으면 카카오톡 발송
        if (kakaoAccount != null && kakaoAccount.getAccessToken() != null) {
            log.info("{} 회원에게 카카오톡으로 피드백을 요청합니다.", user.getEmail());
            kakaoMessageService.sendFeedbackRequest(kakaoAccount.getAccessToken());
        } else {
            // 그 외의 경우 (구글, 네이버 또는 토큰 만료) 기본 이메일 발송
            log.info("{} 회원에게 이메일로 피드백을 요청합니다.", user.getEmail());
            emailService.sendFeedbackRequestEmail(user.getEmail(), user.getNickname());
        }
    }
}