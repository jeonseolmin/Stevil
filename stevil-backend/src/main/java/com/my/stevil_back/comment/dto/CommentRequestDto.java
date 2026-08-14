package com.my.stevil_back.comment.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor

public class CommentRequestDto {
    private String content; // 댓글 내용
    // 💡 핵심: 일반 댓글일 때는 null이 들어오고, 대댓글일 때는 부모 댓글의 ID(Long 또는 Integer)가 들어옵니다.
    private Long parentId;
}
