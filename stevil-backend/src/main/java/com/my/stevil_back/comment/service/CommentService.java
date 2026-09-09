package com.my.stevil_back.comment.service;

import com.my.stevil_back.comment.dto.CommentRequestDto;
import com.my.stevil_back.comment.dto.CommentResponseDto;
import com.my.stevil_back.comment.entity.Comment;
import com.my.stevil_back.comment.repository.CommentRepository;
import com.my.stevil_back.post.entity.Post;
import com.my.stevil_back.post.repository.PostRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // 댓글 저장 로직
    public void addComment(Long postId, CommentRequestDto dto, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        if (user.isSuspended()) {
            throw new RuntimeException("활동이 정지된 계정입니다. 댓글을 작성할 수 없습니다.");
        }

        Comment comment = new Comment();
        comment.setContent(dto.getContent());
        comment.setAuthor(user.getNickname());
        comment.setAuthorEmail(user.getEmail());
        comment.setPost(post);
        comment.setUser(user);

        // 부모 댓글 처리
        if (dto.getParentId() != null) {
            Comment parentComment = commentRepository.findById(dto.getParentId())
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글이 존재하지 않습니다."));
            comment.setParent(parentComment);
        }

        commentRepository.save(comment);

        post.setCommentCount(post.getCommentCount() + 1);
    }

    public void updateComment(Long postId, Long commentId, CommentRequestDto commentRequestDto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        if (user.isSuspended()) {
            throw new RuntimeException("활동이 정지된 계정입니다.");
        }

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("수정할 댓글이 없습니다."));

        if (!comment.getPost().getId().equals(postId)) {
            throw new RuntimeException("잘못된 요청입니다.");
        }

        comment.setContent(commentRequestDto.getContent());
        commentRepository.save(comment);
    }

    // 댓글 목록 조회 로직
    @Transactional(readOnly = true)
    public List<CommentResponseDto> getComments(Long postId) {
        return commentRepository.findByPostId(postId)
                .stream()
                .map(CommentResponseDto::from)
                .toList();
    }
}