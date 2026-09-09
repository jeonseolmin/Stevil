package com.my.stevil_back.feedback.service;

import com.my.stevil_back.feedback.dto.request.FeedbackCreateRequest;
import com.my.stevil_back.feedback.entity.Feedback;
import com.my.stevil_back.feedback.repository.ServiceFeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final ServiceFeedbackRepository feedbackRepository;

    @Transactional
    public void createFeedback(FeedbackCreateRequest request, Long userId) {
        Feedback feedback = Feedback.builder()
                .rating(request.rating())
                .content(request.content().trim())
                .userId(userId)
                .build();

        feedbackRepository.save(feedback);
    }
}