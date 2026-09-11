package com.my.stevil_back.diet.service;

import com.my.stevil_back.diet.dto.DietDashboardResponse;
import com.my.stevil_back.diet.dto.DietRecordRequest;
import com.my.stevil_back.diet.entity.DietRecord;
import com.my.stevil_back.diet.entity.UserDietGoal;
import com.my.stevil_back.diet.policy.NutritionPolicy;
import com.my.stevil_back.diet.repository.DietRecordRepository;
import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.UserWeight;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DietService {

    private final UserDietGoalRepository userDietGoalRepository;
    private final DietRecordRepository dietRecordRepository;
    private final UserRepository userRepository;
    private final UserWeightRepository userWeightRepository;

    /**
     * 영양 목표 계산 정책.
     */
    private final NutritionPolicy nutritionPolicy;

    /**
     * application.yaml / application-local.yaml 등에 설정된
     * 업로드 디렉터리.
     */
    @Value("${app.upload-dir}")
    private String uploadDir;

    // =========================================================
    // 식단 대시보드
    // =========================================================

    @Transactional
    public DietDashboardResponse getDashboardData(
            Long userId,
            LocalDate targetDate
    ) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "회원을 찾을 수 없습니다."
                        )
                );

        /*
         * 목표가 없는 경우 새로 생성한다.
         *
         * 기존 목표가 있는 사용자도
         * 정책 버전이 오래되었으면 Protein First 정책으로
         * 한 번 갱신한다.
         */
        UserDietGoal goal = userDietGoalRepository
                .findByUserId(userId)
                .map(existingGoal ->
                        migrateNutritionPolicyIfNeeded(
                                user,
                                existingGoal
                        )
                )
                .orElseGet(() ->
                        calculatePersonalizedGoal(user)
                );

        /*
         * 조회 날짜가 null이면 오늘 사용.
         */
        LocalDate date = targetDate != null
                ? targetDate
                : LocalDate.now();

        List<DietRecord> dailyRecords =
                dietRecordRepository
                        .findByUserIdAndRecordDate(
                                userId,
                                date
                        );

        // =====================================================
        // 오늘 섭취량 집계
        // =====================================================

        int totalCalories = 0;

        double totalCarbs = 0;
        double totalProtein = 0;
        double totalFat = 0;

        double totalFiber = 0;
        double totalCalcium = 0;
        double totalVitaminC = 0;
        double totalSodium = 0;

        // =====================================================
        // 알레르기
        // =====================================================

        boolean hasWarning = false;

        String warningFood = "";

        List<String> detectedAllergens =
                new ArrayList<>();

        List<String> userAllergies =
                goal.getAllergies() != null
                        && !goal.getAllergies().isBlank()
                        ? Arrays.stream(
                        goal.getAllergies()
                        .split(",")
                )
                          .map(String::trim)
                          .filter(allergy ->
                                  !allergy.isBlank()
                          )
                          .collect(Collectors.toList())
                        : new ArrayList<>();

        // =====================================================
        // 영양소 합산 + 알레르기 검사
        // =====================================================

        for (DietRecord record : dailyRecords) {

            totalCalories += record.getCalories();

            totalCarbs += record.getCarbs();
            totalProtein += record.getProtein();
            totalFat += record.getFat();

            totalFiber += record.getFiber();
            totalCalcium += record.getCalcium();
            totalVitaminC += record.getVitaminC();
            totalSodium += record.getSodium();

            /*
             * 현재 알레르기 검사는 음식명 기반의 단순 검사.
             *
             * 추후 식품 성분 데이터가 확보되면
             * ingredient 기반으로 변경 가능.
             */
            for (String allergy : userAllergies) {

                if (record.getFoodName() == null) {
                    continue;
                }

                if (record.getFoodName().contains(allergy)) {

                    hasWarning = true;

                    warningFood =
                            record.getFoodName();

                    if (!detectedAllergens.contains(allergy)) {
                        detectedAllergens.add(allergy);
                    }
                }
            }
        }

        // =====================================================
        // 오늘 식단 기록 DTO
        // =====================================================

        List<DietDashboardResponse.DietRecordDto> recordDtos =
                dailyRecords.stream()
                        .map(record ->
                                DietDashboardResponse
                                        .DietRecordDto
                                        .builder()
                                        .recordId(
                                                record.getId()
                                        )
                                        .mealType(
                                                record.getMealType()
                                        )
                                        .time(
                                                record.getRecordTime()
                                                        != null
                                                        ? record.getRecordTime()
                                                          .toString()
                                                        : ""
                                        )
                                        .foodName(
                                                record.getFoodName()
                                        )
                                        .calories(
                                                record.getCalories()
                                        )
                                        .protein(
                                                roundOneDecimal(
                                                        record.getProtein()
                                                )
                                        )
                                        .build()
                        )
                        .collect(Collectors.toList());

        // =====================================================
        // Protein First 계산
        // =====================================================

        double proteinAchievementRate =
                nutritionPolicy
                        .calculateProteinAchievementRate(
                                totalProtein,
                                goal.getTargetProtein()
                        );

        double proteinDeficit =
                nutritionPolicy
                        .calculateProteinDeficit(
                                totalProtein,
                                goal.getTargetProtein()
                        );

        // =====================================================
        // 응답
        // =====================================================

        return DietDashboardResponse.builder()

                // 오늘 기본 섭취량
                .todayTotalCalories(
                        totalCalories
                )
                .targetCalories(
                        goal.getTargetCalories()
                )
                .todayCarbs(
                        roundOneDecimal(totalCarbs)
                )
                .todayProtein(
                        roundOneDecimal(totalProtein)
                )
                .todayFat(
                        roundOneDecimal(totalFat)
                )

                // Protein First
                .targetProtein(
                        goal.getTargetProtein()
                )
                .proteinAchievementRate(
                        proteinAchievementRate
                )
                .proteinDeficit(
                        proteinDeficit
                )

                // 알레르기
                .registeredAllergies(
                        userAllergies
                )
                .hasAllergyWarning(
                        hasWarning
                )
                .warningFoodName(
                        warningFood
                )
                .detectedAllergens(
                        detectedAllergens
                )

                // 영양 섭취 상세
                .carbsDetail(
                        calculateStatus(
                                totalCarbs,
                                goal.getTargetCarbs(),
                                false
                        )
                )
                .proteinDetail(
                        calculateStatus(
                                totalProtein,
                                goal.getTargetProtein(),
                                false
                        )
                )
                .fatDetail(
                        calculateStatus(
                                totalFat,
                                goal.getTargetFat(),
                                false
                        )
                )
                .fiberDetail(
                        calculateStatus(
                                totalFiber,
                                goal.getTargetFiber(),
                                false
                        )
                )
                .calciumDetail(
                        calculateStatus(
                                totalCalcium,
                                goal.getTargetCalcium(),
                                false
                        )
                )
                .vitaminCDetail(
                        calculateStatus(
                                totalVitaminC,
                                goal.getTargetVitaminC(),
                                false
                        )
                )
                .sodiumDetail(
                        calculateStatus(
                                totalSodium,
                                goal.getTargetSodium(),
                                true
                        )
                )

                // 목표
                .targetWeight(
                        goal.getTargetWeight()
                )

                // 오늘 기록
                .todayRecords(
                        recordDtos
                )

                .build();
    }

    // =========================================================
    // 기존 영양 정책 마이그레이션
    // =========================================================

    /**
     * 기존 UserDietGoal 데이터가 VERSION 1 또는 null인 경우
     * Protein First 정책으로 한 번 변경한다.
     *
     * 기존 사용자의 목표 칼로리와 목표 체중은 유지하고,
     * 탄수화물 / 단백질 / 지방 목표만 새로운 정책으로 계산한다.
     */
    private UserDietGoal migrateNutritionPolicyIfNeeded(
            User user,
            UserDietGoal goal
    ) {

        Integer currentVersion =
                goal.getNutritionPolicyVersion();

        if (currentVersion != null
                && currentVersion
                >= NutritionPolicy.CURRENT_VERSION) {

            return goal;
        }

        UserWeight latestWeight =
                getLatestWeight(user);

        double currentWeight =
                resolveCurrentWeight(latestWeight);

        double targetWeight =
                resolveExistingTargetWeight(
                        goal,
                        latestWeight,
                        currentWeight
                );

        /*
         * 기존 사용자의 목표 칼로리는 최대한 보존한다.
         *
         * 비정상 값(0 이하)인 경우에만 새로 계산.
         */
        int targetCalories =
                goal.getTargetCalories();

        if (targetCalories <= 0) {
            targetCalories =
                    calculateTargetCalories(
                            currentWeight,
                            targetWeight
                    );
        }

        double targetProtein =
                nutritionPolicy
                        .calculateProteinTarget(
                                currentWeight,
                                targetWeight
                        );

        double targetCarbs =
                nutritionPolicy
                        .calculateCarbsTarget(
                                targetCalories,
                                targetProtein
                        );

        double targetFat =
                nutritionPolicy
                        .calculateFatTarget(
                                targetCalories,
                                targetProtein
                        );

        goal.setTargetWeight(targetWeight);

        goal.setTargetCalories(targetCalories);

        goal.setTargetProtein(targetProtein);

        goal.setTargetCarbs(targetCarbs);

        goal.setTargetFat(targetFat);

        goal.setNutritionPolicyVersion(
                NutritionPolicy.CURRENT_VERSION
        );

        /*
         * @Transactional 상태라 dirty checking으로도 저장되지만,
         * 정책 변경 의도를 명확히 하기 위해 save 호출.
         */
        return userDietGoalRepository.save(goal);
    }

    // =========================================================
    // 영양 상태 판정
    // =========================================================

    /**
     * 프론트에서 바로 사용할 수 있도록
     * 적정 / 부족 / 과다 상태를 계산한다.
     */
    private DietDashboardResponse.NutritionDetail calculateStatus(
            double current,
            double target,
            boolean isLessBetter
    ) {

        String status = "적정";

        if (target > 0) {

            double ratio =
                    current / target;

            if (isLessBetter) {

                /*
                 * 나트륨처럼 제한량 개념인 경우.
                 */
                if (ratio > 1.0) {
                    status = "과다";
                } else {
                    status = "적정";
                }

            } else {

                /*
                 * 일반 영양소.
                 *
                 * 80% 미만 -> 부족
                 * 80~120% -> 적정
                 * 120% 초과 -> 과다
                 */
                if (ratio < 0.8) {

                    status = "부족";

                } else if (ratio > 1.2) {

                    status = "과다";
                }
            }
        }

        return DietDashboardResponse
                .NutritionDetail
                .builder()
                .currentAmount(
                        roundOneDecimal(current)
                )
                .targetAmount(
                        roundOneDecimal(target)
                )
                .status(
                        status
                )
                .build();
    }

    // =========================================================
    // 신규 사용자 영양 목표 생성
    // =========================================================

    private UserDietGoal calculatePersonalizedGoal(
            User user
    ) {

        UserWeight latestWeight =
                getLatestWeight(user);

        double currentWeight =
                resolveCurrentWeight(
                        latestWeight
                );

        double targetWeight =
                resolveTargetWeight(
                        latestWeight,
                        currentWeight
                );

        int targetCalories =
                calculateTargetCalories(
                        currentWeight,
                        targetWeight
                );

        /*
         * Protein First
         *
         * 1. 단백질 목표를 체중 기반으로 먼저 결정
         * 2. 남은 칼로리를 탄수화물 / 지방에 배분
         */
        double targetProtein =
                nutritionPolicy
                        .calculateProteinTarget(
                                currentWeight,
                                targetWeight
                        );

        double targetCarbs =
                nutritionPolicy
                        .calculateCarbsTarget(
                                targetCalories,
                                targetProtein
                        );

        double targetFat =
                nutritionPolicy
                        .calculateFatTarget(
                                targetCalories,
                                targetProtein
                        );

        UserDietGoal newGoal =
                UserDietGoal.builder()
                        .user(user)

                        .targetWeight(
                                targetWeight
                        )

                        .targetCalories(
                                targetCalories
                        )

                        .targetCarbs(
                                targetCarbs
                        )

                        .targetProtein(
                                targetProtein
                        )

                        .targetFat(
                                targetFat
                        )

                        .targetFiber(
                                25
                        )

                        .targetCalcium(
                                700
                        )

                        .targetVitaminC(
                                100
                        )

                        .targetSodium(
                                2000
                        )

                        .allergies(
                                ""
                        )

                        .nutritionPolicyVersion(
                                NutritionPolicy.CURRENT_VERSION
                        )

                        .build();

        return userDietGoalRepository.save(
                newGoal
        );
    }

    // =========================================================
    // 체중 / 칼로리 계산
    // =========================================================

    private UserWeight getLatestWeight(
            User user
    ) {

        return userWeightRepository
                .findFirstByUserIdOrderByRecordedAtDesc(
                        user.getId()
                )
                .orElse(null);
    }

    /**
     * 현재 체중.
     *
     * 체중 기록이 없는 경우 기존 서비스와 동일하게
     * 70kg 방어값 사용.
     */
    private double resolveCurrentWeight(
            UserWeight latestWeight
    ) {

        if (latestWeight != null
                && latestWeight.getWeight() != null) {

            return latestWeight
                    .getWeight()
                    .doubleValue();
        }

        return 70.0;
    }

    /**
     * 신규 목표 생성용 목표 체중.
     */
    private double resolveTargetWeight(
            UserWeight latestWeight,
            double currentWeight
    ) {

        if (latestWeight != null
                && latestWeight.getTargetWeight() != null) {

            return latestWeight
                    .getTargetWeight()
                    .doubleValue();
        }

        /*
         * 기존 서비스와 동일한 기본값.
         */
        return Math.max(
                currentWeight - 5.0,
                1.0
        );
    }

    /**
     * 기존 UserDietGoal 마이그레이션용.
     *
     * 우선순위:
     *
     * 1. 최신 UserWeight의 targetWeight
     * 2. 기존 UserDietGoal의 targetWeight
     * 3. 현재 체중 -5kg
     */
    private double resolveExistingTargetWeight(
            UserDietGoal goal,
            UserWeight latestWeight,
            double currentWeight
    ) {

        if (latestWeight != null
                && latestWeight.getTargetWeight() != null) {

            return latestWeight
                    .getTargetWeight()
                    .doubleValue();
        }

        if (goal.getTargetWeight() > 0) {
            return goal.getTargetWeight();
        }

        return Math.max(
                currentWeight - 5.0,
                1.0
        );
    }

    /**
     * 기존 프로젝트에서 사용하던 칼로리 정책은
     * 이번 단계에서는 유지한다.
     *
     * 추후 BMR/TDEE 정책은 별도로 개선 가능.
     */
    private int calculateTargetCalories(
            double currentWeight,
            double targetWeight
    ) {

        // 약식 BMR
        double bmr =
                currentWeight * 24;

        // 일반 활동량 기준
        double tdee =
                bmr * 1.3;

        int targetCalories =
                (int) tdee;

        if (targetWeight < currentWeight) {

            // 감량
            targetCalories -= 500;

        } else if (targetWeight > currentWeight) {

            // 증량
            targetCalories += 300;
        }

        /*
         * 기존 서비스 방어값 유지.
         */
        if (targetCalories < 1200) {
            targetCalories = 1200;
        }

        return targetCalories;
    }

    // =========================================================
    // 음식 검색
    // =========================================================

    public Object searchFood(
            String keyword
    ) {

        /*
         * 현재 프론트 테스트용 mock 데이터.
         *
         * 기존 기능을 그대로 유지한다.
         */
        List<Map<String, Object>> mockResults =
                new ArrayList<>();

        Map<String, Object> mockFood1 =
                new HashMap<>();

        mockFood1.put(
                "foodName",
                keyword + " 샐러드"
        );

        mockFood1.put(
                "calories",
                150
        );

        mockFood1.put(
                "carbs",
                10.5
        );

        mockFood1.put(
                "protein",
                5.0
        );

        mockFood1.put(
                "fat",
                3.2
        );

        Map<String, Object> mockFood2 =
                new HashMap<>();

        mockFood2.put(
                "foodName",
                keyword + " 닭가슴살 볶음밥"
        );

        mockFood2.put(
                "calories",
                450
        );

        mockFood2.put(
                "carbs",
                60.0
        );

        mockFood2.put(
                "protein",
                25.0
        );

        mockFood2.put(
                "fat",
                12.0
        );

        mockResults.add(
                mockFood1
        );

        mockResults.add(
                mockFood2
        );

        return mockResults;
    }

    // =========================================================
    // 식단 기록 저장
    // =========================================================

    @Transactional
    public void addRecord(
            Long userId,
            DietRecordRequest request,
            MultipartFile image
    ) {

        User user =
                userRepository
                        .findById(userId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "가입된 회원이 아닙니다."
                                )
                        );

        String imageUrl = null;

        // =====================================================
        // 이미지 저장
        // =====================================================

        if (image != null
                && !image.isEmpty()) {

            try {

                Path uploadPath =
                        Paths.get(uploadDir)
                                .toAbsolutePath()
                                .normalize();

                Files.createDirectories(
                        uploadPath
                );

                String originalFilename =
                        image.getOriginalFilename();

                if (originalFilename == null
                        || originalFilename.isBlank()) {

                    originalFilename =
                            "image";
                }

                /*
                 * ../../ 등의 경로 이동 공격 방지.
                 */
                originalFilename =
                        Paths.get(originalFilename)
                                .getFileName()
                                .toString();

                String savedFilename =
                        UUID.randomUUID()
                                + "_diet_"
                                + originalFilename;

                Path targetPath =
                        uploadPath
                                .resolve(savedFilename)
                                .normalize();

                /*
                 * 최종 경로가 upload 디렉터리를 벗어나는지 확인.
                 */
                if (!targetPath.startsWith(uploadPath)) {

                    throw new IllegalArgumentException(
                            "올바르지 않은 파일 경로입니다."
                    );
                }

                image.transferTo(
                        targetPath.toFile()
                );

                imageUrl =
                        "/api/uploads/"
                                + savedFilename;

            } catch (Exception e) {

                throw new RuntimeException(
                        "식단 이미지 업로드 실패",
                        e
                );
            }
        }

        // =====================================================
        // DietRecord 생성
        // =====================================================

        DietRecord record =
                DietRecord.builder()

                        .user(user)

                        .recordDate(
                                request.getRecordDate() != null
                                        ? request.getRecordDate()
                                        : LocalDate.now()
                        )

                        .recordTime(
                                request.getRecordTime() != null
                                        ? request.getRecordTime()
                                        : LocalTime.now()
                        )

                        .mealType(
                                request.getMealType() != null
                                        ? request.getMealType()
                                        : "기타"
                        )

                        .foodName(
                                request.getFoodName()
                        )

                        .imageUrl(
                                imageUrl
                        )

                        .calories(
                                request.getCalories()
                        )

                        .carbs(
                                request.getCarbs()
                        )

                        .protein(
                                request.getProtein()
                        )

                        .fat(
                                request.getFat()
                        )

                        .fiber(
                                request.getFiber()
                        )

                        .calcium(
                                request.getCalcium()
                        )

                        .vitaminC(
                                request.getVitaminC()
                        )

                        .sodium(
                                request.getSodium()
                        )

                        .build();

        dietRecordRepository.save(
                record
        );
    }

    // =========================================================
    // 공통 숫자 처리
    // =========================================================

    private double roundOneDecimal(
            double value
    ) {

        return Math.round(
                value * 10.0
        ) / 10.0;
    }
}