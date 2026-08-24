package com.my.stevil_back.post.entity;

import com.my.stevil_back.comment.entity.Comment;
import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "posts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    private String author;      // 닉네임 (화면 표시용)
    private String authorEmail; // 이메일 (권한 검사용)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Builder.Default
    private int viewCount = 0;

    @Builder.Default
    private int commentCount = 0;

    @Builder.Default
    private int likeCount = 0;

    @Builder.Default
    @Column(name = "is_notice", nullable = false, columnDefinition = "boolean default false")
    private boolean notice = false; // 공지사항 여부

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PostFile> files = new ArrayList<>();

    public void addFile(PostFile postFile) {
        this.files.add(postFile);
        postFile.setPost(this);
    }

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean allowComment = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean allowCopy = true;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean autoSource = true;

    @Column(length = 500)
    private String externalLink;

    @OneToOne(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private PostVote postVote;
}