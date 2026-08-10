package com.my.stevil_back.exercise.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "exercise")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // 기본 생성자 접근 제어로 객체 안정성 향상
public class Exercise {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name; // 운동명 (예: 걷기, 스쿼트)

    @Column(columnDefinition = "TEXT")
    private String description; // 상세 설명

    @Column(length = 20)
    private String category; // 카테고리 (유산소, 무산소, 스트레칭)

    @Column(name = "target_part", length = 20)
    private String targetPart; // 타겟 부위 (전신, 하체, 가슴 등)

    @Column(length = 50)
    private String equipment; // 필요 장비 (맨몸, 덤벨, 머신 등)

    @Column(length = 10)
    private String difficulty; // 난이도 (초, 중, 고)

    @Column(name = "calories_per_10min")
    private Integer caloriesPer10Min; // 10분당 소모 칼로리

    @Column(name = "short_desc", length = 200)
    private String shortDesc; // 한 줄 설명

    // Builder 패턴을 적용하여 객체 생성 시 가독성과 안정성 확보
    @Builder
    public Exercise(String name, String description, String category, String targetPart,
                    String equipment, String difficulty, Integer caloriesPer10Min, String shortDesc) {
        this.name = name;
        this.description = description;
        this.category = category;
        this.targetPart = targetPart;
        this.equipment = equipment;
        this.difficulty = difficulty;
        this.caloriesPer10Min = caloriesPer10Min;
        this.shortDesc = shortDesc;
    }
}