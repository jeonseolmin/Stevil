package com.my.stevil_back.comment.repository;

import com.my.stevil_back.comment.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    // 특정 게시글 번호(postId)에 달린 댓글들만 골라서 리스트로 가져옴
    List<Comment> findByPostId(Long postId);
    Page<Comment> findByAuthorEmailOrderByIdDesc(String authorEmail, Pageable pageable);
    Optional<Comment> findById(Long id);
}