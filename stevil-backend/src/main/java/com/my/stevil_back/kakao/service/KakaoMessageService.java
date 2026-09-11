package com.my.stevil_back.kakao.service;

import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.auth.social.repository.SocialAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoMessageService {

    private final SocialAccountRepository socialAccountRepository;

    @Transactional(readOnly = true)
    public void sendMessage(Long userId, String text) {
        // 1. DB에서 해당 유저의 카카오 소셜 계정 정보(토큰)를 꺼내옴
        SocialAccount kakaoAccount = socialAccountRepository.findByUserIdAndProvider(userId, ProviderType.KAKAO)
                .orElseThrow(() -> new IllegalArgumentException("카카오 연동 정보가 없거나 로그아웃 되었습니다."));

        String accessToken = kakaoAccount.getAccessToken();

        // 2. 카카오 API로 전송할 세팅
        RestTemplate restTemplate = new RestTemplate();
        String url = "https://kapi.kakao.com/v2/api/talk/memo/default/send";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBearerAuth(accessToken); // DB에서 꺼낸 토큰을 헤더에 삽입

        // 3. 메시지 템플릿 작성 (배포 환경 EC2 주소 적용)
        String templateObject = String.format(
                "{\"object_type\":\"text\",\"text\":\"%s\",\"link\":{\"web_url\":\"http://15.165.242.94:8080\"}}",
                text
        );

        MultiValueMap<String, String> params = new LinkedMultiValueMap<>();
        params.add("template_object", templateObject);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(params, headers);

        // 4. 전송 및 에러 핸들링
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.error("카카오톡 메시지 전송 실패: {}", response.getBody());
                throw new RuntimeException("카카오 API 통신 에러");
            }
        } catch (Exception e) {
            log.error("카카오 API 호출 중 예외 발생: ", e);
            throw new RuntimeException("카카오톡 알림 전송에 실패했습니다.");
        }
    }
}