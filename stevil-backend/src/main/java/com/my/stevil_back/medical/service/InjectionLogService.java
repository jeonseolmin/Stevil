package com.my.stevil_back.medical.service;

import com.my.stevil_back.medical.dto.InjectionRequestDto;
import com.my.stevil_back.medical.entity.InjectionLog;
import com.my.stevil_back.medical.repository.InjectionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InjectionLogService {

    private final InjectionLogRepository injectionLogRepository;

    // 유저별 리포트 요약 데이터를 저장할 캐시 맵
    private final Map<Long, List<InjectionLog>> reportCache = new ConcurrentHashMap<>();

    // 1. 주사 기록 저장
    @Transactional
    public void saveLog(Long userId, InjectionRequestDto requestDto) {
        InjectionLog log = new InjectionLog();
        log.setUserId(userId);
        log.setRecordDate(requestDto.getRecordDate());
        log.setDosage(requestDto.getDosage());
        log.setInjectionSite(requestDto.getInjectionSite());
        log.setSymptoms(requestDto.getSymptoms());
        log.setLifestyleMemo(requestDto.getLifestyleMemo());

        injectionLogRepository.save(log);

        // 새로운 기록이 추가되었으므로 해당 유저의 캐시를 비워 다음 조회 시 갱신되도록 함
        reportCache.remove(userId);
    }

    // 2. 최근 기록 조회 (캐시 적용)
    public List<InjectionLog> getRecentLogs(Long userId) {
        // 캐시에 해당 유저의 기록이 없으면 DB에서 조회하여 캐시에 저장 후 반환
        return reportCache.computeIfAbsent(userId, id ->
                injectionLogRepository.findByUserIdOrderByRecordDateDesc(id)
        );
    }
}