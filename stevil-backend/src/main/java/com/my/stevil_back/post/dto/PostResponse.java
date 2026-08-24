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
    private boolean allowComment;
    private boolean allowCopy;
    private boolean autoSource;
    private String externalLink;

    private String author;
    private String authorEmail;

    private int viewCount;
    private int commentCount;
    private int likeCount;

    private boolean notice;
    private LocalDateTime createdAt;

    private List<FileResponse> files;

    private PostVoteDto vote;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FileResponse {
        private String originalFileName;
        private String fileUrl;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostVoteDto {
        private Long id;
        private String title;
        private boolean allowMultiple;
        private List<VoteOptionDto> options;

        public static PostVoteDto from(com.my.stevil_back.post.entity.PostVote postVote) {
            return PostVoteDto.builder()
                    .id(postVote.getId())
                    .title(postVote.getTitle())
                    .allowMultiple(postVote.isAllowMultiple())
                    .options(postVote.getOptions().stream()
                            .map(VoteOptionDto::from)
                            .collect(Collectors.toList()))
                    .build();
        }
    }

    // 투표 항목 DTO
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VoteOptionDto {
        private Long id;
        private String content;
        private int voteCount;

        public static VoteOptionDto from(com.my.stevil_back.post.entity.VoteOption option) {
            return VoteOptionDto.builder()
                    .id(option.getId())
                    .content(option.getContent())
                    .voteCount(option.getVoteCount())
                    .build();
        }
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
                .allowComment(post.isAllowComment())
                .allowCopy(post.isAllowCopy())
                .autoSource(post.isAutoSource())
                .externalLink(post.getExternalLink())
                .vote(post.getPostVote() != null ? PostVoteDto.from(post.getPostVote()) : null)
                .build();
    }
}