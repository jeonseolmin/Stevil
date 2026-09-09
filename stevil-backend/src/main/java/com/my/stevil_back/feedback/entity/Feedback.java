package com.my.stevil_back.feedback.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity(name = "ServiceFeedback")
@Table(name = "feedbacks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feedback extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int rating;

    @Column(nullable = false, length = 1000)
    private String content;

    // 회원이 로그인한 상태에서 보냈을 경우를 대비한 유저 식별자 (익명이면 null)
    @Column(name = "user_id")
    private Long userId;

    @Builder
    private Feedback(int rating, String content, Long userId) {
        this.rating = rating;
        this.content = content;
        this.userId = userId;
    }
}