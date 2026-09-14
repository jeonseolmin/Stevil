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
         * Diet에서 사용하는 확정 영양 목표가 있다면
         * Planner에서도 동일한 값을 사용한다.
         */
        Preferences effectivePreferences =
                applyDietGoal(
                        userId,
                        preferences
                );

        PlannerValidation.preferences(
                effectivePreferences
        );

        if (!effectivePreferences.aiConsent()) {

            throw new IllegalArgumentException(
                    "입력한 생활 정보를 AI에 전송하는 데 동의해 주세요."
            );
        }

        // =====================================================
        // 사용자별 생성 요청 제한
        // =====================================================

        Instant now =
                Instant.now();

        /*
         * 5분 이상 지난 요청 기록 정리.
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
            // Spring -> Python Planner
            // =================================================

            String requestBody =
                    json.writeValueAsString(
                            effectivePreferences
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
            // 응답 크기 방어
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
            // Python 오류 처리
            // =================================================

            if (
                    response.statusCode() != 200
            ) {

                var failure =
                        json.readTree(
                                response.body()
                        );

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
            // Python 응답 검증
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
             * Python이 생성한 이벤트를 다시 서버에서 검증.
             *
             * 여기에서도 Diet 목표가 반영된
             * effectivePreferences를 사용한다.
             */
            PlannerValidation.events(
                    effectivePreferences,
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
             * 개인정보 / 건강정보 / AI 응답 본문은
             * 로그에 남기지 않는다.
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
         * nutritionGoal을 사용하지 않는 요청은
         * 기존 동작 그대로 유지.
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
         * Diet 목표가 없으면
         * 프론트에서 받은 Planner 목표를 그대로 사용.
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
         * 0으로 나누는 상황 방어.
         */
        if (
                weightKg <= 0
        ) {

            return preferences;
        }

        double targetProtein =
                dietGoal.getTargetProtein();

        if (
                targetProtein <= 0
        ) {

            return preferences;
        }

        // =====================================================
        // Diet 단백질 목표를 Planner 형식으로 변환
        // =====================================================

        /*
         * Python Planner는 현재:
         *
         * protein =
         * weightKg * proteinPerKg
         *
         * 로 계산한다.
         *
         * 따라서 Diet의 확정 targetProtein과
         * 동일한 결과가 나오도록 역산한다.
         */
        double proteinPerKg =
                targetProtein
                        / weightKg;

        proteinPerKg =
                Math.max(
                        0.1,
                        Math.min(
                                3.0,
                                proteinPerKg
                        )
                );

        // =====================================================
        // Diet 칼로리 목표 우선
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
         * NutritionGoal / Python validation 범위.
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

        /*
         * 핵심 수정.
         *
         * 생성 시와 동일하게 저장 시에도
         * Diet의 영양 목표를 적용한다.
         */
        Preferences effectivePreferences =
                applyDietGoal(
                        userId,
                        request.preferences()
                );

        /*
         * Diet 목표가 반영된 기준으로
         * 이벤트를 검증한다.
         */
        PlannerValidation.events(
                effectivePreferences,
                request.events()
        );

        // =====================================================
        // 사용자 Lock
        // =====================================================

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
                                effectivePreferences
                                        .weekStart()
                        )
                        .orElseGet(
                                () ->
                                        new WeeklyPlan(
                                                userId,
                                                effectivePreferences
                                                        .weekStart()
                                        )
                        );

        // =====================================================
        // Revision 검증
        // =====================================================

        if (
                plan.getRevision()
                        != request.revision()
        ) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "다른 화면에서 일정이 변경됐습니다. 주간 일정을 다시 불러와 주세요."
            );
        }

        /*
         * 여기에서도 원본 request.preferences()가 아니라
         * Diet 목표가 반영된 effectivePreferences를 저장한다.
         *
         * 이렇게 해야 다음 번 loadWeek() 때도
         * Planner 화면이 동일한 영양 목표를 유지한다.
         */
        Saved result =
                new Saved(
                        plan.getRevision() + 1,
                        effectivePreferences,
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