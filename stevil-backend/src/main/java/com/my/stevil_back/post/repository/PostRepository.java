package com.my.stevil_back.post.repository;

import com.my.stevil_back.post.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findByTitleContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Post> findByCategoryAndTitleContainingIgnoreCase(String category, String keyword, Pageable pageable);

    Page<Post> findByContentContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Post> findByCategoryAndContentContainingIgnoreCase(String category, String keyword, Pageable pageable);

    Page<Post> findByAuthorContainingIgnoreCase(String keyword, Pageable pageable);

    Page<Post> findByCategoryAndAuthorContainingIgnoreCase(String category, String keyword, Pageable pageable);

    Page<Post> findAllByOrderByNoticeDescCreatedAtDesc(Pageable pageable);

    Page<Post> findByCategoryOrderByNoticeDescCreatedAtDesc(String category, Pageable pageable);

    List<Post> findTop5ByOrderByLikeCountDesc();

    Page<Post> findByCategory(String category,Pageable pageable);

    Page <Post> findByAuthorEmailOrderByIdDesc(String email, Pageable pageable);

    long countByAuthorEmail(String authorEmail);
}