package com.my.stevil_back.ai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AiDoctorAssistService {

    @Value("${spring.ai.google.gemini.api-key}")
    private String geminiApiKey;

    private final Map<String, String> symptomAlertCache = new ConcurrentHashMap<>();

    public String analyzeMedicationLogText(String logText) {
        String guideContext = "";
        if (logText.contains("설사")) {
            guideContext = symptomAlertCache.computeIfAbsent("설사", key ->
                    "마운자로 초기 투여 시 잦은 설사로 인한 탈수 위험이 있음. 전해질 보충 안내 필요."
            );
        }

        String prompt = String.format("""
            너는 비만 클리닉 전문의를 보조하는 AI 비서야.
            환자가 제출한 [투약일지 내역]을 분석하여 의사가 한눈에 파악할 수 있도록 요약해줘.
            
            [투약일지 내역]
            "%s"
            
            [의사 참고용 시스템 알림]
            "%s"
            
            [작성 규칙]
            1. 환자의 주요 증상, 이상 징후, 식단/운동 상태를 3~4줄로 핵심만 요약할 것.
            2. 의사가 환자에게 어떻게 답변하면 좋을지 [추천 답변 초안]을 하단에 제안할 것.
            """, logText, guideContext);

        try {
            // trim()을 추가하여 눈에 보이지 않는 공백이나 줄바꿈을 완벽히 제거합니다.
            String cleanKey = geminiApiKey.trim();
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + cleanKey;

            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // JSON 에러를 막기 위한 이스케이프 처리
            String safePrompt = prompt.replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
            String requestBody = "{\"contents\":[{\"parts\":[{\"text\":\"" + safePrompt + "\"}]}]}";

            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            Map responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("candidates")) {
                List<Map> candidates = (List<Map>) responseBody.get("candidates");
                if (!candidates.isEmpty()) {
                    Map content = (Map) candidates.get(0).get("content");
                    List<Map> parts = (List<Map>) content.get("parts");
                    if (!parts.isEmpty()) {
                        return (String) parts.get(0).get("text");
                    }
                }
            }
            return "AI 응답을 파싱하지 못했습니다.";

        } catch (Exception e) {
            throw new RuntimeException("Gemini API 통신 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }
}