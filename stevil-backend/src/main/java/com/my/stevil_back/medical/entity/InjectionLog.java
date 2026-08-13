package com.my.stevil_back.medical.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Entity
@Getter @Setter @NoArgsConstructor
public class InjectionLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long userId; // 사용자 식별자

    private LocalDate recordDate; // 주사 투여 날짜
    private Double dosage; // 투여 용량 (예: 0.6, 1.2)
    private String injectionSite; // 주사 부위 (예: 좌측 복부)

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "injection_symptoms", joinColumns = @JoinColumn(name = "log_id"))
    @Column(name = "symptom")
    private List<String> symptoms; // 선택한 증상 리스트

    @Column(length = 500)
    private String lifestyleMemo; // 식단/운동/특이사항 메모
}