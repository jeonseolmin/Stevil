package com.my.stevil_back.post.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 사용자가 올린 원래 파일명 (예: 내사진.jpg)
    private String originalFileName;

    // 서버에 겹치지 않게 저장된 파일명 (예: 1234abcd-내사진.jpg)
    private String savedFileName;

    // 프론트에서 접근할 파일 주소
    private String fileUrl;

    // 파일 크기 기록 (옵션)
    private Long fileSize;

    // 어떤 게시글에 달린 파일인지 연결 (N:1 관계)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id")
    private Post post;
}