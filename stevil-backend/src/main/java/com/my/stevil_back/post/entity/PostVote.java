package com.my.stevil_back.post.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class PostVote {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post; // 어느 게시글의 투표인지

    @Column(nullable = false)
    private String title; // 투표 제목 (예: "오늘 점심 메뉴 추천 좀요")

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean allowMultiple; // 중복 선택 허용 여부

    @Builder.Default
    @OneToMany(mappedBy = "postVote", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VoteOption> options = new ArrayList<>();

    public void addOption(VoteOption option) {
        options.add(option);
        option.setPostVote(this);
    }
}