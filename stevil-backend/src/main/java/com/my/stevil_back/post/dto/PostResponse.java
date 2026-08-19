package com.my.stevil_back.post.dto;

import com.my.stevil_back.post.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostResponse {
    private Long id;
    private String category;
    private String title;
    private String content;

    private String author;
    private String authorEmail;

    private int viewCount;
    private int commentCount;
    private int likeCount;

    private boolean notice;
    private LocalDateTime createdAt;

    private List<FileResponse> files;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileResponse {
        private String originalFileName;
        private String fileUrl;
    }

    public static PostResponse from(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .category(post.getCategory())
                .title(post.getTitle())
                .content(post.getContent())
                .author(post.getAuthor())
                .authorEmail(post.getAuthorEmail())
                .viewCount(post.getViewCount())
                .commentCount(post.getCommentCount())
                .likeCount(post.getLikeCount())
                .notice(post.isNotice())
                .createdAt(post.getCreatedAt())
                .files(post.getFiles() != null ? post.getFiles().stream()
                                                 .map(file -> new FileResponse(file.getOriginalFileName(), file.getFileUrl()))
                                                 .collect(Collectors.toList()) : null)
                .build();
    }
}