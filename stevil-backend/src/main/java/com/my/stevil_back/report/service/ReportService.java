package com.my.stevil_back.report.service;

import com.my.stevil_back.report.dto.ReportRequestDto;
import com.my.stevil_back.report.entity.Report;
import com.my.stevil_back.report.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final ReportRepository reportRepository;

    @Transactional
    public String createReport(String reporterEmail, ReportRequestDto requestDto) {

        // 1. 중복 신고 검증 (이 사람이 이 글을 이미 신고했는지 확인)
        boolean alreadyReported = reportRepository.existsByReporterEmailAndTargetTypeAndTargetId(
                reporterEmail,
                requestDto.getTargetType(),
                requestDto.getTargetId()
        );

        if (alreadyReported) {
            // 이미 신고했다면 에러를 던져서 프론트엔드로 돌려보냅니다.
            throw new IllegalArgumentException("이미 신고가 접수된 대상입니다.");
        }

        // 2. 이상이 없다면 신고 내역을 DB에 저장할 엔티티로 포장
        Report report = Report.builder()
                .reporterEmail(reporterEmail)
                .targetType(requestDto.getTargetType())
                .targetId(requestDto.getTargetId())
                .category(requestDto.getCategory())
                .reason(requestDto.getReason())
                .build();

        reportRepository.save(report);

        return "신고가 정상적으로 접수되었습니다.";
    }

    @Transactional(readOnly = true)
    public List<Report> getAllReportsForAdmin() {
        return reportRepository.findAllByOrderByCreatedAtDesc();
    }
}