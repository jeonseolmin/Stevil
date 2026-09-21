# Python Rules

- Python services live inside this repository and should be treated as separate runtime components from the Spring Boot backend and React frontend.
- Before changing Python code, inspect the existing package structure, entry points, dependency files, and current execution method.
- Reuse the existing environment/tooling convention already used by the service (`venv`, `uv`, `pip`, or project-specific tooling).
- Do not introduce a new dependency manager or framework unless the task explicitly requires it.
- Preserve existing API contracts between Python services and the backend.
- For AI/RAG-related code, preserve existing retrieval, embedding, validation, citation, and fallback behavior unless the requested change specifically targets those areas.
- Avoid changing model names, embedding dimensions, vector distance metrics, or prompt contracts without first tracing their downstream impact.
- Keep changes scoped to the requested Python service or module.
- Run the smallest relevant Python test or execution check after changes before broader validation.
- Do not expose API keys, model credentials, tokens, or `.env` contents.
- Preserve existing user changes and uncommitted work.