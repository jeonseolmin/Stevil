package com.my.stevil_back.user.entity;

import com.my.stevil_back.user.entity.enumType.ActivityLevel;
import com.my.stevil_back.user.entity.enumType.Sex;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/*
 * Phase15B: User.activityLevel 필드/domain method만 검증한다.
 *
 * 이 프로젝트에는 @DataJpaTest 같은 repository/integration 테스트
 * 인프라가 없다(StevilBackApplicationTests의 단일 @SpringBootTest만
 * 존재하고, 이마저 이 환경에는 실제 DB가 없어 실행되지 않음 -- Phase15A
 * 보고 참고). 새 무거운 테스트 인프라를 만들지 않고, 실제 JPA
 * save/flush/find 대신 @Enumerated(EnumType.STRING) 매핑이 코드에
 * 그대로 있는지를 reflection으로 확인하는 것으로 대체한다.
 */
class UserTest {

    @Test void existingUserWithoutActivityLevelStaysNull() {
        // A: 기존 방식(activityLevel을 builder에 지정하지 않음)으로 생성해도 정상 동작.
        User user = User.builder()
                .email("existing@example.com")
                .nickname("existing")
                .sex(Sex.MALE)
                .build();

        assertNull(user.getActivityLevel());
    }

    @Test void updateActivityLevelSetsLow() {
        // B
        User user = User.builder().nickname("u").build();
        user.updateActivityLevel(ActivityLevel.LOW);
        assertEquals(ActivityLevel.LOW, user.getActivityLevel());
    }

    @Test void updateActivityLevelSetsModerateAndHigh() {
        // C
        User user = User.builder().nickname("u").build();

        user.updateActivityLevel(ActivityLevel.MODERATE);
        assertEquals(ActivityLevel.MODERATE, user.getActivityLevel());

        user.updateActivityLevel(ActivityLevel.HIGH);
        assertEquals(ActivityLevel.HIGH, user.getActivityLevel());
    }

    @Test void activityLevelFieldIsMappedAsEnumeratedStringNotOrdinal() throws NoSuchFieldException {
        // D 대체: 실제 JPA round-trip 대신, ordinal이 아니라 STRING으로
        // 저장되도록 매핑돼 있는지 reflection으로 고정한다(Sex와 동일 정책).
        Field field = User.class.getDeclaredField("activityLevel");
        Enumerated enumerated = field.getAnnotation(Enumerated.class);

        assertNotNull(enumerated, "activityLevel must be annotated with @Enumerated");
        assertEquals(EnumType.STRING, enumerated.value());
    }

    @Test void completeOnboardingDoesNotTouchActivityLevel() {
        // E: 기존 onboarding 흐름(completeOnboarding)은 activityLevel을
        // 전혀 건드리지 않으므로, 호출 전후로 값이 그대로 유지돼야 한다
        // (OnboardingRequest/Service는 이번 phase에서 무수정).
        User user = User.builder().nickname("u").build();
        assertNull(user.getActivityLevel());

        user.completeOnboarding("이름", LocalDate.of(1995, 1, 1), Sex.FEMALE, 165.0);

        assertNull(user.getActivityLevel());
    }
}
