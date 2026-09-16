package com.my.stevil_back.diet.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.util.Map;

@Service
public class DietAiService {

    // 식단 전용 파이썬 FastAPI 서버 주소 (8092번 포트, 도커 호스트 통신 주소 반영)
    @Value("${planner.diet-generator-url:http://127.0.0.1:8092/api/plan}")
    private String pythonAiUrl;

    public String askPythonAiServer(String question) {
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> requestBody = Map.of("question", question);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);

        try {
            Map response = restTemplate.postForObject(pythonAiUrl, request, Map.class);
            return response != null ? response.get("answer").toString() : "AI 응답을 받지 못했습니다.";
        } catch (Exception e) {
            System.err.println("파이썬 서버 통신 오류: " + e.getMessage());
            return "현재 AI 코치가 잠시 휴식 중입니다. 파이썬 서버가 켜져 있는지 확인해주세요!";
        }
    }
}