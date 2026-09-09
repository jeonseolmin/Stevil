package com.my.stevil_back.common.email.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendFeedbackRequestEmail(String toEmail, String nickname) {
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");

            // 발송자 이름 지정
            helper.setFrom(fromEmail, "Stevil");

            helper.setTo(toEmail);
            helper.setSubject("Stevil에서 당신의 건전한 피드백을 원합니다!");

            String htmlContent = """
                    <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9f9f9; text-align: center; border-radius: 12px;">
                        <h1 style="color: #20bfa9; margin-bottom: 20px; font-size: 28px;">Stevil</h1>
                        <h2 style="color: #333333; font-size: 22px;">건강한 변화, 어떻게 경험하고 계신가요?</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                            안녕하세요, <strong>%s</strong>님!<br>
                            Stevil 서비스를 이용해 주셔서 감사합니다.<br>
                            더 나은 서비스를 제공하기 위해 %s님의 소중한 의견을 듣고 싶습니다.
                        </p>
                        <a href="http://localhost:3000/feedback" style="display: inline-block; padding: 14px 30px; background-color: #20bfa9; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
                            설문조사 참여하기
                        </a>
                        <p style="margin-top: 40px; font-size: 12px; color: #999999;">
                            본 메일은 발신 전용이며, 문의사항은 고객센터를 이용해 주세요.
                        </p>
                    </div>
                    """.formatted(nickname, nickname);

            helper.setText(htmlContent, true);
            javaMailSender.send(mimeMessage);

            log.info("피드백 요청 이메일 발송 완료: {}", toEmail);

        } catch (MessagingException | UnsupportedEncodingException e) {
            log.error("이메일 발송 실패: {}", toEmail, e);
            throw new RuntimeException("이메일 발송 중 오류가 발생했습니다.");
        }
    }
}