package com.my.stevil_back.post.repository;

import com.my.stevil_back.post.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {
    // 특정 유저가 특정 글에 좋아요를 눌렀는지 찾는 메서드
    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    // 이 글에 눌린 총 좋아요 개수 세기 (선택사항)
    int countByPostId(Long postId);
}
