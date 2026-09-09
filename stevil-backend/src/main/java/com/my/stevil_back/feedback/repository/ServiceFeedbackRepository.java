package com.my.stevil_back.feedback.repository;

import com.my.stevil_back.feedback.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceFeedbackRepository extends JpaRepository<Feedback, Long> {
}