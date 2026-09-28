package com.my.stevil_back.user.repository;

import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * UserTest의 기존 주석대로, 이 프로젝트엔 실제 DB에 기대는 repository 테스트
 * 인프라가 없었다(로컬에 Postgres가 없으면 StevilBackApplicationTests도 실행 불가).
 * Testcontainers로 운영과 동일한 Postgres를 띄워 그 공백을 채운다. H2로 대체되지
 * 않도록 AutoConfigureTestDatabase.Replace.NONE이 필요하다.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class UserRepositoryIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    private UserRepository userRepository;

    @Test
    void findByEmail_returnsSavedUser() {
        userRepository.save(User.builder()
                .email("tester@stevil.com")
                .nickname("tester")
                .role(UserRole.ROLE_USER)
                .build());

        Optional<User> found = userRepository.findByEmail("tester@stevil.com");

        assertThat(found).isPresent();
        assertThat(found.get().getNickname()).isEqualTo("tester");
    }

    @Test
    void findByEmail_returnsEmptyWhenMissing() {
        Optional<User> found = userRepository.findByEmail("missing@stevil.com");

        assertThat(found).isEmpty();
    }

    @Test
    void countByRole_countsOnlyMatchingRole() {
        userRepository.save(User.builder().email("a@stevil.com").nickname("a").role(UserRole.ROLE_USER).build());
        userRepository.save(User.builder().email("b@stevil.com").nickname("b").role(UserRole.ROLE_DOCTOR).build());

        assertThat(userRepository.countByRole(UserRole.ROLE_USER)).isEqualTo(1L);
        assertThat(userRepository.countByRole(UserRole.ROLE_DOCTOR)).isEqualTo(1L);
    }
}
