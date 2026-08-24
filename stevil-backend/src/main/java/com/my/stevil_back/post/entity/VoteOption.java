package com.my.stevil_back.post.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class VoteOption {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_vote_id")
    private PostVote postVote; // 이 항목이 속한 투표

    @Column(nullable = false)
    private String content; // 항목 내용 (예: "짜장면")

    @Builder.Default
    @Column(nullable = false)
    private int voteCount = 0; // 득표수
}