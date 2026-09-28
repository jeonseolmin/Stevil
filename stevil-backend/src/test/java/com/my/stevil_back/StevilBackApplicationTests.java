package com.my.stevil_back;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/*
 * spring.profiles.default(local)이 로컬 Postgres(localhost:5434)와 JWT_SECRET
 * 환경변수를 요구해서, 그것들이 없는 환경(CI 등)에서는 항상 실패했다.
 * Testcontainers로 컨텍스트 로딩용 Postgres를 직접 띄우고, JWT_SECRET은
 * 컨텍스트 부팅에만 쓰이는 테스트 전용 값으로 대체한다(운영 값이 아님).
 */
@SpringBootTest
@Testcontainers
@TestPropertySource(properties = "spring.jwt.secret=test-only-context-loads-secret")
class StevilBackApplicationTests {

	@Container
	@ServiceConnection
	static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

	@Test
	void contextLoads() {
	}

}
