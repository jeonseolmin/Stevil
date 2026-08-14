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
    private String author;      // 💡 이 필드가 반드시 있어야 합니다!
    private String authorEmail;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Seoul")
    private LocalDateTime createdAt;

    private Long parentId;

    public static CommentResponseDto from(Comment comment) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .content(comment.getContent())

                // 💡 핵심: DB에 저장된 닉네임(comment.getAuthor())을 DTO로 쏙 집어넣어 줍니다!
                .author(comment.getAuthor() != null ? comment.getAuthor() : "익명")
                .authorEmail(comment.getAuthorEmail())

                .createdAt(comment.getCreatedAt())
                .parentId(comment.getParent() != null ? comment.getParent().getId() : null)
                .build();
    }
}