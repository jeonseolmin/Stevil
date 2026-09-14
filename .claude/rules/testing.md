# Testing Rules

- Never delete, disable, skip, or weaken tests just to make a build pass.
- Fix the implementation or test setup according to the current intended behavior.
- When a test fails, identify the first real cause before changing code.
- Treat secondary compiler/type-inference errors as possible cascade errors until the primary compile error is fixed.
- Prefer the smallest relevant test scope first, then expand validation.

## Backend validation
- Run backend commands from `stevil-backend`.
- Compile first:
  `.\gradlew.bat compileJava compileTestJava`
- If compilation succeeds, run only the tests related to the change.
- Run broader test suites only after focused tests pass or when the task requires it.

## Test doubles
- Add mocks according to the current production constructor signatures.
- Only add stubbing when the production call path actually requires it.
- Do not add obsolete constructors or compatibility code to production solely for old tests.

## Reporting
- Report the actual command executed.
- Report whether compilation passed or failed.
- Report test counts and failures when available.
- If anything remains broken, include the exact error and likely root cause.
- Never claim success without running the relevant verification command.