package com.my.stevil_back.comment.controller;

import com.my.stevil_back.comment.dto.CommentRequestDto;
import com.my.stevil_back.comment.dto.CommentResponseDto;
import com.my.stevil_back.comment.service.CommentService;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 댓글 목록 조회 (GET /api/community/{id}/comments)
    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentResponseDto>> getComments(@PathVariable Long id) {
        List<CommentResponseDto> comments = commentService.getComments(id);
        return ResponseEntity.ok(comments);
    }

    // 댓글 작성 (POST /api/community/{id}/comments)
    @PostMapping("/{id}/comments")
    public ResponseEntity<String> addComment(
            @PathVariable Long id,
            @RequestBody CommentRequestDto commentRequestDto,
            @AuthenticationPrincipal CustomUserDetails userDetails // 💡 수정
    ) {
        // 💡 getName() 대신 getUserId() (또는 getId()) 사용
        commentService.addComment(id, commentRequestDto, userDetails.getUserId());
        return ResponseEntity.ok("댓글이 성공적으로 작성되었습니다.");
    }

    @PutMapping("/{postId}/comments/{commentId}")
    public ResponseEntity<String> updateComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @RequestBody CommentRequestDto commentRequestDto,
            @AuthenticationPrincipal CustomUserDetails userDetails // 💡 수정
    ) {
        // 💡 userDetails.getUserId() 로 변경
        commentService.updateComment(postId, commentId, commentRequestDto, userDetails.getUserId());
        return ResponseEntity.ok("댓글이 성공적으로 수정되었습니다.");
    }

}