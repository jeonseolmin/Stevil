package com.my.stevil_back.report.dto;

import com.my.stevil_back.report.entity.ReportCategory; // ✨ 새로 추가!
import com.my.stevil_back.report.entity.ReportTargetType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ReportRequestDto {
    private ReportTargetType targetType; // POST 또는 COMMENT
    private Long targetId;               // 게시글 번호 또는 댓글 번호

    private ReportCategory category;
    private String reason; // 신고 사유
}