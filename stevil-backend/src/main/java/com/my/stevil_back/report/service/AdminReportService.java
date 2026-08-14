package com.my.stevil_back.report.service;

import com.my.stevil_back.comment.repository.CommentRepository;
import com.my.stevil_back.post.repository.PostRepository;
import com.my.stevil_back.report.entity.ReportTargetType; // 🌟 추가
import com.my.stevil_back.report.repository.ReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminReportService {

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ReportRepository reportRepository;

    public AdminReportService(PostRepository postRepository, CommentRepository commentRepository, ReportRepository reportRepository) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.reportRepository = reportRepository;
    }

    // 📢 게시글 삭제 로직
    @Transactional
    public void deletePostByAdmin(Long postId) {
        // 1. 얽혀있는 신고 기록부터 무조건 싹 날립니다. (String 대신 Enum 사용!)
        reportRepository.deleteByTargetTypeAndTargetId(ReportTargetType.POST, postId);

        // 2. 게시글 본체가 아직 살아있다면 지웁니다. (이미 지워진 유령 데이터면 에러 없이 넘어감)
        if (postRepository.existsById(postId)) {
            postRepository.deleteById(postId);
        }
    }

    // 📢 댓글 삭제 로직
    @Transactional
    public void deleteCommentByAdmin(Long commentId) {
        // 1. 얽혀있는 신고 기록부터 무조건 싹 날립니다. (String 대신 Enum 사용!)
        reportRepository.deleteByTargetTypeAndTargetId(ReportTargetType.COMMENT, commentId);

        // 2. 댓글 본체가 아직 살아있다면 지웁니다. (이미 지워졌으면 신고 내역만 지우고 쿨하게 종료)
        if (commentRepository.existsById(commentId)) {
            commentRepository.deleteById(commentId);
        }
    }
}