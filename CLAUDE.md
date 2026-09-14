# Stevil Project Instructions

## Project layout
- Project root: `C:\Users\human-01\Desktop\stevil`
- Backend: `stevil-backend`
- Backend stack: Spring Boot + Gradle
- Frontend and Python services also exist in this repository.
- Run backend Gradle commands from the `stevil-backend` directory.

## Development rules
- Read the existing implementation before modifying code.
- Prefer minimal changes that preserve current architecture and behavior.
- Do not add compatibility constructors or revert production code just to make old tests compile.
- Do not delete, disable, or skip tests to make builds pass.
- Preserve existing uncommitted user changes.
- Do not commit or push unless explicitly requested.
- Avoid unrelated refactoring.

## Validation
- After backend changes, compile with:
  `.\gradlew.bat compileJava compileTestJava`
- Run the smallest relevant test scope first.
- Report the actual command results; never assume success.

## Environment and secrets
- `.env` is not committed to Git.
- Never print, request, expose, or hard-code passwords, API keys, OAuth secrets, database credentials, or other secrets.
- Do not create or modify `.env` unless explicitly requested.
- VS Code launch configuration may use:
  `${workspaceFolder}/.env`

## API conventions
- Use `/api` as the API prefix unless the existing implementation clearly specifies otherwise.
- Preserve existing REST API contracts where possible.

## Safety around files
- Check `git status` and `git diff` before significant edits.
- Do not overwrite existing user work.