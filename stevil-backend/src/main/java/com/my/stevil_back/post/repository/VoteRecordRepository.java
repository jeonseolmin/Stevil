package com.my.stevil_back.post.repository;

import com.my.stevil_back.post.entity.VoteRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VoteRecordRepository extends JpaRepository<VoteRecord, Long> {
    // 기존에 추가했던 중복 확인용
    boolean existsByPostVoteIdAndUserId(Long postVoteId, Long userId);

    // 사용자가 투표한 기록 리스트 싹 다 가져오기
    List<VoteRecord> findByPostVoteIdAndUserId(Long postVoteId, Long userId);
}