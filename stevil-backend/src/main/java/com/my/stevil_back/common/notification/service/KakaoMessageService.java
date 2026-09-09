package com.my.stevil_back.common.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoMessageService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    public void sendFeedbackRequest(String kakaoAccessToken) {
        String url = "https://kapi.kakao.com/v2/api/talk/memo/default/send";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBearerAuth(kakaoAccessToken); // DB에 저장된 유저의 카카오 토큰

        // 텍스트와 링크 버튼이 포함된 카카오톡 기본 템플릿
        String templateObject = """
                {
                    "object_type": "text",
                    "text": "Stevil 서비스를 이용해 주셔서 감사합니다.\\n더 나은 서비스를 위해 소중한 의견을 들려주세요!",
                    "link": {
                        "web_url": "%s/feedback",
                        "mobile_web_url": "%s/feedback"
                    },
                    "button_title": "설문조사 참여하기"
                }
                """.formatted(frontendBaseUrl, frontendBaseUrl);

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("template_object", templateObject);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            log.info("카카오톡 피드백 알림 발송 완료: {}", response.getBody());
        } catch (Exception e) {
            log.error("카카오톡 메시지 발송 실패. 토큰이 만료되었거나 권한이 없을 수 있습니다.", e);
            throw new RuntimeException("카카오톡 메시지 발송에 실패했습니다.");
        }
    }
}