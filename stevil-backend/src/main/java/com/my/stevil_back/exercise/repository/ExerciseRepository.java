package com.my.stevil_back.exercise.repository;

import com.my.stevil_back.exercise.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    // 1. 카테고리별 조회 (예: '유산소' 운동만 찾기)
    List<Exercise> findByCategory(String category);

    // 2. 타겟 부위별 조회 (예: '하체' 운동만 찾기)
    List<Exercise> findByTargetPart(String targetPart);

    // 3. 필요 장비로 조회 (예: '맨몸' 운동만 찾기 - 홈트레이닝 유저용)
    List<Exercise> findByEquipment(String equipment);

    // 4. 난이도별 조회 (예: 초보자를 위한 '초' 난이도 찾기)
    List<Exercise> findByDifficulty(String difficulty);

    // 5. 복합 조건 필터링 (예: 초보자를 위한 맨몸 유산소 운동 추천)
    List<Exercise> findByCategoryAndDifficultyAndEquipment(String category, String difficulty, String equipment);

    // 6. 이름으로 운동 검색 (유저가 기록할 때 '스쿼트'를 검색하는 기능)
    List<Exercise> findByNameContaining(String keyword);
}