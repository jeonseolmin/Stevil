package com.my.stevil_back.diet.service;

import com.my.stevil_back.diet.dto.DietDashboardResponse;
import com.my.stevil_back.diet.entity.DietRecord;
import com.my.stevil_back.diet.entity.UserDietGoal;
import com.my.stevil_back.diet.repository.DietRecordRepository;
import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.UserWeight;
import com.my.stevil_back.user.repository.UserRepository;
import com.my.stevil_back.user.repository.UserWeightRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class DietService {

    private final UserDietGoalRepository userDietGoalRepository;
    private final DietRecordRepository dietRecordRepository;
    private final UserRepository userRepository;

    // 💡 체중 연동을 위한 레포지토리 추가
    private final UserWeightRepository userWeightRepository;

    // 💡 데이터를 새로 저장(save)할 수도 있으므로 읽기/쓰기 트랜잭션으로 변경
    @Transactional
    public DietDashboardResponse getDashboardData(Long userId, LocalDate targetDate) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        // 1. 유저의 목표 설정 불러오기 (없으면 실제 체중을 기반으로 자동 계산하여 생성!)
        UserDietGoal goal = userDietGoalRepository.findByUserId(userId)
                .orElseGet(() -> calculatePersonalizedGoal(user));

        // 2. 해당 날짜(오늘)의 식단 기록 전부 가져오기
        List<DietRecord> dailyRecords = dietRecordRepository.findByUserIdAndRecordDate(userId, targetDate);

        // 3. 오늘 하루 총 섭취량 계산용 변수들
        int totalCalories = 0;
        double totalCarbs = 0, totalProtein = 0, totalFat = 0;
        double totalFiber = 0, totalCalcium = 0, totalVitaminC = 0, totalSodium = 0;

        boolean hasWarning = false;
        String warningFood = "";
        List<String> detectedAllergens = new ArrayList<>();
        List<String> userAllergies = goal.getAllergies() != null && !goal.getAllergies().isBlank()
                ? Arrays.asList(goal.getAllergies().split(","))
                : new ArrayList<>();

        // 4. 먹은 음식들 영양소 합산 및 알레르기 검사 로직
        for (DietRecord record : dailyRecords) {
            totalCalories += record.getCalories();
            totalCarbs += record.getCarbs();
            totalProtein += record.getProtein();
            totalFat += record.getFat();
            totalFiber += record.getFiber();
            totalCalcium += record.getCalcium();
            totalVitaminC += record.getVitaminC();
            totalSodium += record.getSodium();

            // 알레르기 검사: 먹은 음식 이름에 알레르기 키워드가 포함되어 있는지 확인
            for (String allergy : userAllergies) {
                if (record.getFoodName() != null && record.getFoodName().contains(allergy.trim())) {
                    hasWarning = true;
                    warningFood = record.getFoodName();
                    if (!detectedAllergens.contains(allergy.trim())) {
                        detectedAllergens.add(allergy.trim());
                    }
                }
            }
        }

        // 5. 프론트엔드 리스트용 데이터 변환
        List<DietDashboardResponse.DietRecordDto> recordDtos = dailyRecords.stream()
                .map(r -> DietDashboardResponse.DietRecordDto.builder()
                        .recordId(r.getId())
                        .mealType(r.getMealType())
                        .time(r.getRecordTime() != null ? r.getRecordTime().toString() : "")
                        .foodName(r.getFoodName())
                        .calories(r.getCalories())
                        .build())
                .collect(Collectors.toList());

        // 6. 최종 응답(DTO) 조립
        return DietDashboardResponse.builder()
                .todayTotalCalories(totalCalories)
                .targetCalories(goal.getTargetCalories())
                .todayCarbs(Math.round(totalCarbs * 10) / 10.0)
                .todayProtein(Math.round(totalProtein * 10) / 10.0)
                .todayFat(Math.round(totalFat * 10) / 10.0)

                // 알레르기 주의보 데이터
                .registeredAllergies(userAllergies)
                .hasAllergyWarning(hasWarning)
                .warningFoodName(warningFood)
                .detectedAllergens(detectedAllergens)

                // 영양 섭취 상세 상태 (적정/부족/과다 자동 계산)
                .carbsDetail(calculateStatus(totalCarbs, goal.getTargetCarbs(), false))
                .proteinDetail(calculateStatus(totalProtein, goal.getTargetProtein(), false))
                .fatDetail(calculateStatus(totalFat, goal.getTargetFat(), false))
                .fiberDetail(calculateStatus(totalFiber, goal.getTargetFiber(), false))
                .calciumDetail(calculateStatus(totalCalcium, goal.getTargetCalcium(), false))
                .vitaminCDetail(calculateStatus(totalVitaminC, goal.getTargetVitaminC(), false))
                .sodiumDetail(calculateStatus(totalSodium, goal.getTargetSodium(), true)) // 나트륨은 적게 먹어야 함

                .targetWeight(goal.getTargetWeight())
                .todayRecords(recordDtos)
                .build();
    }

    // (핵심) 프론트를 위해 "적정/부족/과다"를 판별해주는 헬퍼 메서드
    private DietDashboardResponse.NutritionDetail calculateStatus(double current, double target, boolean isLessBetter) {
        String status = "적정";

        if (target > 0) {
            double ratio = current / target;
            if (isLessBetter) {
                // 나트륨(Sodium)처럼 적을수록 좋은 경우: 100% 넘으면 과다
                if (ratio > 1.0) status = "과다";
                else status = "적정";
            } else {
                // 일반 영양소: 80% 미만은 부족, 120% 초과는 과다
                if (ratio < 0.8) status = "부족";
                else if (ratio > 1.2) status = "과다";
            }
        }

        return DietDashboardResponse.NutritionDetail.builder()
                .currentAmount(Math.round(current * 10) / 10.0)
                .targetAmount(target)
                .status(status)
                .build();
    }

    // 💡 실제 체중(UserWeight)을 바탕으로 하루 권장 칼로리 & 탄단지 자동 계산!
    private UserDietGoal calculatePersonalizedGoal(User user) {

        // 회원이 기록한 가장 최근 체중 정보를 꺼내옵니다.
        UserWeight latestWeight = userWeightRepository.findFirstByUserIdOrderByRecordedAtDesc(user.getId())
                .orElse(null);

        // 체중 기록이 전혀 없는 회원을 위한 기본 방어값 (70kg)
        double currentWeight = (latestWeight != null && latestWeight.getWeight() != null)
                ? latestWeight.getWeight().doubleValue() : 70.0;

        double targetWeight = (latestWeight != null && latestWeight.getTargetWeight() != null)
                ? latestWeight.getTargetWeight().doubleValue() : currentWeight - 5.0; // 기본 다이어트 -5kg

        // --- 다이어트 공식 적용 ---
        // 1. 기초대사량(BMR) 약식 계산: 체중 * 24
        double bmr = currentWeight * 24;

        // 2. 하루 총 소비 칼로리(TDEE) = 기초대사량 * 1.3 (일반 활동량 기준)
        double tdee = bmr * 1.3;

        // 3. 다이어트 목표 칼로리 = 소비 칼로리에서 하루 500kcal 덜 먹기
        int targetCalories = (int) tdee;
        if (targetWeight < currentWeight) {
            targetCalories -= 500;
        } else if (targetWeight > currentWeight) {
            targetCalories += 300; // 증량일 경우
        }

        // 건강을 위해 최소 1200kcal 이하는 내려가지 않게 방어
        if (targetCalories < 1200) targetCalories = 1200;

        // 4. 탄단지 황금비율 계산 (다이어트: 탄 40%, 단 40%, 지 20%)
        // 탄수화물/단백질은 1g당 4kcal, 지방은 1g당 9kcal
        double targetCarbs = (targetCalories * 0.4) / 4.0;
        double targetProtein = (targetCalories * 0.4) / 4.0;
        double targetFat = (targetCalories * 0.2) / 9.0;

        // 계산된 진짜 맞춤형 데이터를 생성하여 DB에 저장
        UserDietGoal newGoal = UserDietGoal.builder()
                .user(user)
                .targetWeight(targetWeight)
                .targetCalories(targetCalories)
                .targetCarbs(Math.round(targetCarbs))
                .targetProtein(Math.round(targetProtein))
                .targetFat(Math.round(targetFat))
                .targetFiber(25)     // 식이섬유 하루 권장량 고정
                .targetCalcium(700)  // 칼슘 권장량 고정
                .targetVitaminC(100) // 비타민C 고정
                .targetSodium(2000)  // 나트륨 최대 허용치 고정
                .allergies("")       // 추후 유저 알레르기 연동
                .build();

        return userDietGoalRepository.save(newGoal);
    }

    public Object searchFood(String keyword) {
        // 프론트엔드가 화면을 테스트할 수 있도록 가짜 데이터를 먼저 넘겨줍니다.
        List<Map<String, Object>> mockResults = new ArrayList<>();

        Map<String, Object> mockFood1 = new HashMap<>();
        mockFood1.put("foodName", keyword + " 샐러드");
        mockFood1.put("calories", 150);
        mockFood1.put("carbs", 10.5);
        mockFood1.put("protein", 5.0);
        mockFood1.put("fat", 3.2);

        Map<String, Object> mockFood2 = new HashMap<>();
        mockFood2.put("foodName", keyword + " 닭가슴살 볶음밥");
        mockFood2.put("calories", 450);
        mockFood2.put("carbs", 60.0);
        mockFood2.put("protein", 25.0);
        mockFood2.put("fat", 12.0);

        mockResults.add(mockFood1);
        mockResults.add(mockFood2);

        return mockResults;
    }

    // 식단 직접 입력 & 사진 등록 처리
    @Transactional
    public void addRecord(Long userId, com.my.stevil_back.diet.dto.DietRecordRequest request, MultipartFile image) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        String imageUrl = null;

        // 사진이 첨부되었다면 서버에 저장합니다.
        if (image != null && !image.isEmpty()) {
            try {
                String os = System.getProperty("os.name").toLowerCase();
                String uploadDir = os.contains("win") ? "C:/uploads/" : "/home/ubuntu/uploads/";

                java.io.File dir = new java.io.File(uploadDir);
                if (!dir.exists()) dir.mkdirs();

                String originalFilename = image.getOriginalFilename();
                String savedFilename = java.util.UUID.randomUUID() + "_diet_" + originalFilename;
                java.io.File targetFile = new java.io.File(uploadDir + savedFilename);
                image.transferTo(targetFile);

                imageUrl = "/api/uploads/" + savedFilename;
            } catch (Exception e) {
                throw new RuntimeException("식단 이미지 업로드 실패", e);
            }
        }

        // 프론트에서 받은 정보와 이미지 URL을 묶어서 DB에 저장합니다.
        DietRecord record = DietRecord.builder()
                .user(user)
                .recordDate(request.getRecordDate() != null ? request.getRecordDate() : LocalDate.now())
                .recordTime(request.getRecordTime() != null ? request.getRecordTime() : java.time.LocalTime.now())
                .mealType(request.getMealType() != null ? request.getMealType() : "기타")
                .foodName(request.getFoodName())
                .imageUrl(imageUrl)
                .calories(request.getCalories())
                .carbs(request.getCarbs())
                .protein(request.getProtein())
                .fat(request.getFat())
                .fiber(request.getFiber())
                .calcium(request.getCalcium())
                .vitaminC(request.getVitaminC())
                .sodium(request.getSodium())
                .build();

        dietRecordRepository.save(record);
    }
}