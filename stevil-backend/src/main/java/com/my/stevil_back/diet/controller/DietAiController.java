package com.my.stevil_back.diet.controller;

import com.my.stevil_back.diet.service.DietAiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/diet/ai")
@RequiredArgsConstructor
public class DietAiController {

    private final DietAiService dietAiService;

    @PostMapping("/ask")
    public ResponseEntity<?> askAiCoach(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        String answer = dietAiService.askPythonAiServer(question);

        return ResponseEntity.ok(Map.of("answer", answer));
    }
}