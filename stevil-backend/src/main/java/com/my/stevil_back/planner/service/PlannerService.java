package com.my.stevil_back.planner.service;

import com.my.stevil_back.diet.repository.UserDietGoalRepository;
import com.my.stevil_back.planner.dto.NutritionGoal;
import com.my.stevil_back.planner.dto.Preferences;
import com.my.stevil_back.planner.dto.request.Save;
import com.my.stevil_back.planner.dto.response.Draft;
import com.my.stevil_back.planner.dto.response.Saved;
import com.my.stevil_back.planner.entity.WeeklyPlan;
import com.my.stevil_back.planner.repository.WeeklyPlanRepository;
import com.my.stevil_back.planner.validation.PlannerValidation;
import com.my.stevil_back.user.repository.UserRepository;

import jakarta.validation.Validator;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class PlannerService {

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(
                    PlannerService.class
            );

    private final WeeklyPlanRepository repository;

    private final UserRepository users;

    /**
     * Diet에서 확정한 칼로리/단백질 목표를
     * Planner에 연결하기 위해 사용한다.
     */
    private final UserDietGoalRepository dietGoals;

    private final ObjectMapper json;

    private final Validator validator;

    private final URI generator;

    private final HttpClient client =
            HttpClient
                    .newBuilder()
                    .connectTimeout(
                            Duration.ofSeconds(5)
                    )
                    .build();

    /**
     * 사용자별 Planner 생성 요청 제한.
     */
    private final ConcurrentHashMap<Long, Instant> requests =
            new ConcurrentHashMap<>();

    public PlannerService(
            WeeklyPlanRepository repository,
            UserRepository users,
            UserDietGoalRepository dietGoals,
            ObjectMapper json,
            Validator validator,
            @Value(
                    "${planner.generator-url:http://127.0.0.1:8091/api/plan}"
            )
            String url
    ) {

        this.repository = repository;
        this.users = users;
        this.dietGoals = dietGoals;
        this.json = json;
        this.validator = validator;
        this.generator = URI.create(url);
    }

    // =========================================================
    // Planner 생성
    // =========================================================

    public Draft generate(
            Long userId,
            Preferences preferences
    ) {

        /*
         * 중요:
         *
         * 프론트에서 넘어온 nutritionGoal을 그대로 Python에
         * 보내지 않고, Diet에서 확정된 목표가 있으면
         * 그 값으로 덮어쓴다.
         *
         * 따라서:
         *
         * Diet 목표
         *      ↓
         * PlannerService
         *      ↓
         * Python Planner
         *
         * 가 같은 칼로리/단백질 목표를 사용한다.
         */
        preferences =
                applyDietGoal(
                        userId,
                        preferences
                );

        // 최종적으로 Python에 전달할 값 검증
        PlannerValidation.preferences(
                preferences
        );

        if (!preferences.aiConsent()) {

            throw new IllegalArgumentException(
                    "입력한 생활 정보를 AI에 전송하는 데 동의해 주세요."
            );
        }

        // =====================================================
        // 요청 빈도 제한
        // =====================================================

        Instant now =
                Instant.now();

        /*
         * 오래된 요청 기록 제거.
         */
        requests
                .entrySet()
                .removeIf(
                        entry ->
                                entry
                                        .getValue()
                                        .isBefore(
                                                now.minusSeconds(
                                                        300
                                                )
                                        )
                );

        requests.compute(
                userId,
                (key, last) -> {

                    if (
                            last != null
                                    && last.isAfter(
                                    now.minusSeconds(
                                            100
                                    )
                            )
                    ) {

                        throw new ResponseStatusException(
                                HttpStatus.TOO_MANY_REQUESTS,
                                "계획 생성 후 잠시 기다려 주세요."
                        );
                    }

                    return now;
                }
        );

        String stage =
                "connection";

        try {

            // =================================================
            // Spring -> Python /api/plan
            // =================================================

            String requestBody =
                    json.writeValueAsString(
                            preferences
                    );

            HttpRequest request =
                    HttpRequest
                            .newBuilder(
                                    generator
                            )
                            .timeout(
                                    Duration.ofSeconds(
                                            95
                                    )
                            )
                            .header(
                                    "Content-Type",
                                    "application/json"
                            )
                            .POST(
                                    HttpRequest
                                            .BodyPublishers
                                            .ofString(
                                                    requestBody
                                            )
                            )
                            .build();

            HttpResponse<String> response =
                    client.send(
                            request,
                            HttpResponse
                                    .BodyHandlers
                                    .ofString()
                    );

            stage =
                    "response";

            // =================================================
            // 응답 크기 제한
            // =================================================

            if (
                    response.body() != null
                            && response
                            .body()
                            .length() > 400_000
            ) {

                throw new IllegalStateException(
                        "Planner response too large"
                );
            }

            // =================================================
            // Python 오류 응답
            // =================================================

            if (
                    response.statusCode() != 200
            ) {

                /*
                 * Python이 JSON 오류 응답을 보낸 경우.
                 */
                var failure =
                        json.readTree(
                                response.body()
                        );

                /*
                 * 식품 데이터나 영양 매칭 데이터 준비 실패.
                 */
                if (
                        "FOOD_NOT_READY".equals(
                                failure
                                        .path("code")
                                        .asText()
                        )
                ) {

                    String message =
                            failure
                                    .path("error")
                                    .asText();

                    throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            message == null
                                    || message.isBlank()
                                    ? "식단 생성에 필요한 음식 데이터를 준비하지 못했습니다."
                                    : message
                    );
                }

                throw new IllegalStateException(
                        "Planner generator returned status "
                                + response.statusCode()
                );
            }

            // =================================================
            // Python 응답 DTO 변환
            // =================================================

            stage =
                    "validation";

            Draft draft =
                    json.readValue(
                            response.body(),
                            Draft.class
                    );

            if (
                    draft == null
                            || !validator
                            .validate(draft)
                            .isEmpty()
            ) {

                throw new IllegalStateException(
                        "Invalid planner draft"
                );
            }

            /*
             * AI가 만들어낸 이벤트를 서버에서 다시 검증한다.
             */
            PlannerValidation.events(
                    preferences,
                    draft.events()
            );

            return draft;

        } catch (
                ResponseStatusException error
        ) {

            requests.remove(
                    userId,
                    now
            );

            throw error;

        } catch (
                InterruptedException error
        ) {

            requests.remove(
                    userId,
                    now
            );

            Thread.currentThread()
                    .interrupt();

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "계획 생성을 완료하지 못했습니다."
            );

        } catch (
                Exception error
        ) {

            requests.remove(
                    userId,
                    now
            );

            /*
             * 건강정보 / API Key / 응답 본문은 로그에 남기지 않는다.
             */
            log.warn(
                    "Planner generation failed: stage={}, type={}",
                    stage,
                    error
                            .getClass()
                            .getSimpleName()
            );

            if (
                    "validation".equals(
                            stage
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "생성된 식단의 형식이나 영양정보 검증에 실패했습니다. 다시 생성해 주세요."
                );
            }

            if (
                    "response".equals(
                            stage
                    )
            ) {

                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "AI 생성 서비스에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
                );
            }

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "AI 생성 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."
            );
        }
    }

    // =========================================================
    // Diet -> Planner 영양 목표 연결
    // =========================================================

    /**
     * UserDietGoal에 저장된 Protein First 목표를
     * Planner의 NutritionGoal로 반영한다.
     *
     * Python Planner는 현재:
     *
     * protein =
     * weightKg * proteinPerKg
     *
     * 방식으로 동작한다.
     *
     * 그래서 Diet의 targetProtein을 그대로 전달하는 대신:
     *
     * proteinPerKg =
     * targetProtein / weightKg
     *
     * 로 역산해서 전달한다.
     */
    private Preferences applyDietGoal(
            Long userId,
            Preferences preferences
    ) {

        if (
                preferences == null
        ) {

            return null;
        }

        NutritionGoal originalGoal =
                preferences.nutritionGoal();

        /*
         * 현재 Planner UI에서 영양 목표 사용을 하지 않는 요청이면
         * 기존 동작을 유지한다.
         */
        if (
                originalGoal == null
        ) {

            return preferences;
        }

        var dietGoalOptional =
                dietGoals.findByUserId(
                        userId
                );

        /*
         * Diet 목표가 아직 만들어지지 않은 사용자는
         * 기존 Planner 입력값을 그대로 사용한다.
         */
        if (
                dietGoalOptional.isEmpty()
        ) {

            return preferences;
        }

        var dietGoal =
                dietGoalOptional.get();

        double weightKg =
                originalGoal.weightKg();

        /*
         * 유효하지 않은 체중이면 원본 사용.
         *
         * DTO validation에서도 걸리지만
         * 0으로 나누는 상황을 먼저 방어한다.
         */
        if (
                weightKg <= 0
        ) {

            return preferences;
        }

        double targetProtein =
                dietGoal.getTargetProtein();

        /*
         * Diet 단백질 목표가 아직 설정되지 않았다면
         * 기존 Planner 값을 유지한다.
         */
        if (
                targetProtein <= 0
        ) {

            return preferences;
        }

        // =====================================================
        // Diet targetProtein -> Planner proteinPerKg
        // =====================================================

        double proteinPerKg =
                targetProtein
                        / weightKg;

        /*
         * 현재 Java DTO / Python Planner의 허용 범위:
         *
         * 0.1 ~ 3.0 g/kg
         *
         * 비정상 값으로 Planner 전체가 실패하지 않게
         * 기술적 범위 내로 제한한다.
         */
        proteinPerKg =
                Math.max(
                        0.1,
                        Math.min(
                                3.0,
                                proteinPerKg
                        )
                );

        // =====================================================
        // 칼로리도 Diet 기준값 우선
        // =====================================================

        int targetCalories =
                dietGoal.getTargetCalories();

        if (
                targetCalories <= 0
        ) {

            targetCalories =
                    originalGoal.calories();
        }

        /*
         * 현재 NutritionGoal validation 범위를 초과하는
         * DB 데이터가 있으면 기존 Planner 입력값을 사용한다.
         */
        if (
                targetCalories < 1000
                        || targetCalories > 5000
        ) {

            targetCalories =
                    originalGoal.calories();
        }

        NutritionGoal mergedGoal =
                new NutritionGoal(
                        weightKg,
                        proteinPerKg,
                        targetCalories,
                        originalGoal.confirmed()
                );

        return preferences.withNutritionGoal(
                mergedGoal
        );
    }

    // =========================================================
    // 저장된 Planner 조회
    // =========================================================

    @Transactional(readOnly = true)
    public Saved get(
            Long userId,
            LocalDate week
    ) {

        return repository
                .findByUserIdAndWeekStart(
                        userId,
                        week
                )
                .map(
                        this::decode
                )
                .orElse(
                        null
                );
    }

    // =========================================================
    // Planner 저장
    // =========================================================

    @Transactional
    public Saved save(
            Long userId,
            Save request
    ) {

        PlannerValidation.events(
                request.preferences(),
                request.events()
        );

        /*
         * 동일 사용자의 계획을 동시에 수정할 때
         * revision 충돌을 막기 위한 lock.
         */
        if (
                users
                        .findByIdForUpdate(
                                userId
                        )
                        .isEmpty()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED
            );
        }

        WeeklyPlan plan =
                repository
                        .findByUserIdAndWeekStart(
                                userId,
                                request
                                        .preferences()
                                        .weekStart()
                        )
                        .orElseGet(
                                () ->
                                        new WeeklyPlan(
                                                userId,
                                                request
                                                        .preferences()
                                                        .weekStart()
                                        )
                        );

        /*
         * optimistic revision 검증.
         */
        if (
                plan.getRevision()
                        != request.revision()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "다른 화면에서 일정이 변경됐습니다. 주간 일정을 다시 불러와 주세요."
            );
        }

        Saved result =
                new Saved(
                        plan.getRevision() + 1,
                        request.preferences(),
                        request.events()
                );

        plan.update(
                json.writeValueAsString(
                        result
                )
        );

        repository.save(
                plan
        );

        return result;
    }

    // =========================================================
    // 저장 JSON -> DTO
    // =========================================================

    private Saved decode(
            WeeklyPlan plan
    ) {

        return json.readValue(
                plan.getPayload(),
                Saved.class
        );
    }
}