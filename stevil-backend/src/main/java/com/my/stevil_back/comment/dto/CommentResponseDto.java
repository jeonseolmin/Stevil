package com.my.stevil_back.comment.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.my.stevil_back.comment.entity.Comment;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CommentResponseDto {

    private Long id;
    private String content;
    private String author;
    private String authorEmail;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Seoul")
    private LocalDateTime createdAt;

    private Long parentId;

    public static CommentResponseDto from(Comment comment) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())

                .author(comment.getAuthor() != null ? comment.getAuthor() : "익명")
                .authorEmail(comment.getAuthorEmail())

                .createdAt(comment.getCreatedAt())
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .build();
    }
}