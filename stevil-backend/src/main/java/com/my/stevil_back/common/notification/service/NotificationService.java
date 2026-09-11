package com.my.stevil_back.common.notification.service;

import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.auth.social.repository.SocialAccountRepository;
import com.my.stevil_back.common.email.service.EmailService;
import com.my.stevil_back.kakao.service.KakaoMessageService; // 💡 새로 만든 패키지 경로로 임포트 변경
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

        // 카카오 계정이고 토큰이 DB에 존재하는지 확인
        boolean isKakaoLinked = accounts.stream()
                .anyMatch(account -> account.getProvider() == ProviderType.KAKAO && account.getAccessToken() != null);

        if (isKakaoLinked) {
            log.info("{} 회원에게 카카오톡으로 피드백을 요청합니다.", user.getEmail());

            String feedbackMessage = "Stevil 서비스 피드백을 남겨주세요! 참여해주셔서 감사합니다.";
            kakaoMessageService.sendMessage(user.getId(), feedbackMessage);

        } else {
            // 그 외의 경우 (구글, 네이버 또는 토큰 만료) 기본 이메일 발송
            log.info("{} 회원에게 이메일로 피드백을 요청합니다.", user.getEmail());
            emailService.sendFeedbackRequestEmail(user.getEmail(), user.getNickname());
        }
    }
}