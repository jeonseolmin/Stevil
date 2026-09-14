# Frontend Rules

- Frontend stack: React + Vite.
- Reuse existing components, hooks, API modules, and styling patterns before creating new ones.
- Do not change route structure or API contracts unless the task explicitly requires it.
- Preserve current login/onboarding flow and authenticated/unauthenticated navigation behavior.
- Use existing `VITE_*` environment variable conventions.
- Do not hard-code backend URLs, OAuth client secrets, API keys, or other secrets.
- Check existing API utility modules before adding direct Axios/fetch calls inside components.
- Keep UI changes localized to the requested feature.
- Avoid unrelated visual redesigns or broad CSS refactors.
- After frontend changes, run the existing lint/build commands defined in the project before reporting success.
- Preserve existing user changes and uncommitted work.