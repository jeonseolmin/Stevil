# Backend Rules

- Backend directory: `stevil-backend`
- Stack: Spring Boot + Gradle
- Run backend commands from the `stevil-backend` directory.
- Prefer existing service/repository/controller patterns before introducing new abstractions.
- Do not add legacy constructors only to satisfy outdated tests.
- Keep REST endpoints under `/api` unless the current implementation clearly uses another path.
- After backend changes, run:
  `.\gradlew.bat compileJava compileTestJava`
- Then run the smallest relevant test scope first.
- Preserve current database mappings, security configuration, and API contracts unless the task explicitly requires changes.
- Do not modify `.env` or expose secrets.