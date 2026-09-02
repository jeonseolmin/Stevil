# Weekly lifestyle planner

## Deployment record — 2026-09-02

Deployed the planner, recipe RAG, weekday exercise windows, calorie summaries and compact expandable detail UI to 15.165.242.94. Source recipes (1,156) and their complete food embedding cache are included in the private RAG image. Spring uses `PLANNER_GENERATOR_URL=http://rag-api:8091/api/plan`; nginx permits 110 seconds for the draft endpoint. Food retrieval remains SQLite inside the RAG image; saved calendars use application PostgreSQL.

Backup: `/home/ubuntu/stevil-rag/backups/planner-20260902T080053Z` (application code, RAG code, PostgreSQL dump). Previous images: `stevil-frontend:before-planner`, `stevil-backend:before-planner`, `stevil-rag-api:before-planner`. Retain these for rollback. No database restore is automatically performed.

Verified server generation of 21 source-matched meals, requested exercise window, anonymous planner API rejection, repeated logout and session-cookie deletion, and the public site's new JavaScript asset. Authenticated browser save/reload with a real user account was not exercised by this deployment check.

The dashboard renders `WeeklyPlanner` above the unrecorded daily items. This is a general lifestyle planning feature, separate from the source-cited Wegovy RAG answers. It does not claim clinical review or change medication schedules.

## Request flow

1. React collects weekday commitments, waking/sleeping and meal times, exercise experience/preferences, food allergies and user-entered restrictions.
2. `POST /api/planner/draft` requires the authenticated user's principal and explicit `aiConsent`. The Spring service rate-limits generation to one attempt per user per 100 seconds (per process), then calls the private Python generator. Food-readiness failures release the cooldown.
3. Python retrieves official COOKRCP01 recipes using a separate Gemini embedding index. It sends retrieved recipe IDs/ingredients plus food/activity preferences, restrictions, experience, intensity and duration to Gemini. Identity, busy-slot titles and full calendar data are not sent. Gemini selects food IDs, which are resolved against only the retrieved rows; it cannot supply food facts. Exercise remains generated content. Deterministic code schedules activities around fixed commitments.
4. The user edits/reviews the draft. `PUT /api/planner` validates date ranges, overlapping events and fixed commitments again. Only this explicit action persists the user's week in the application PostgreSQL `weekly_plans` table. Completion changes also require saving.
5. `GET /api/planner?week=YYYY-MM-DD` returns that authenticated user's saved week or 204. User IDs are never accepted from the request body. A revision conflict returns 409; a user-row lock serializes first inserts and subsequent saves.

## Local use

### Food RAG preparation (required for new drafts)

Set `FOOD_SAFETY_API_KEY` in this folder's ignored `.env` using a key authorized for COOKRCP01. Do not put the key in Vite or commit it.

```powershell
..\.venv\Scripts\python.exe food_catalog.py --build-index
```

This collects the official recipe API over HTTPS with pagination, atomically writes `cache/food/catalog.json`, and builds resumable Gemini 768-dimensional vectors in `cache/food/embeddings.sqlite3`. The food index is separate from the medicine corpus. It is currently local SQLite, not server PostgreSQL. Preserve/copy the whole food cache for deployment; no production import is automatic.

`--sample --build-index` collects only five public samples in a separate file. Samples cannot be used for real weekly plans. Full catalog, complete vectors, and at least 21 retrieved main-dish (`밥`/`일품`) recipes are required. Missing data or search failures stop generation; there is no unsupported-food fallback.

Recipe source, recipe ID, retrieval date, ingredients, raw nutrition fields, raw serving weight and a source-row fingerprint travel with each meal and persist in the existing JSON payload. The UI shows them in the meal editor. Missing values are shown as missing, never zero or inferred; missing serving weights are not converted to a per-person calorie claim. The source URL is the API documentation and the recipe ID identifies the record. Editing food title/details/type detaches the source evidence, while moving times or marking complete retains it.

The catalog has no authoritative allergen/cross-contact metadata: nonempty allergy/excluded-food input (other than an explicit "none") blocks automated meal generation, rather than pretending that substring filters establish safety. Free-text preferences influence semantic retrieval and model choice, but are not a clinically validated nutrition optimizer. There are no calculated calorie targets, therapeutic diet guarantees, or inferred portion recommendations. Medical constraints are still prompt-mediated and require review.

After changes, restart Python and rerun the IntelliJ Spring application. Existing saved plans without food evidence remain readable. Source snapshots/vectors are ignored by Git and must be provisioned independently.

- UI-only preview: `http://127.0.0.1:3001/__design#planner-title`. The planner is labeled as a sample, sends no API requests, and stores sample changes only in component memory until refresh.
- Real mode: log into the normal `/dashboard` using a running Spring backend and its application PostgreSQL database. Run the updated Python service with `python app.py --preview --host 127.0.0.1 --port 8091` from this folder. The existing `.env` Gemini settings are reused. Spring defaults to `http://127.0.0.1:8091/api/plan`.
- Container deployment needs `PLANNER_GENERATOR_URL=http://rag-api:8091/api/plan` in the Spring service environment and the existing shared Docker network. Rebuild Python and Spring as well as the frontend. No production deployment or production schema change was performed for this feature.
- With `ddl-auto=update`, Hibernate creates the new table. For controlled migration, use `stevil-backend/src/main/resources/db/planner.sql`. Never use `ddl-auto=create` on existing data.

## Validation and limits

The UI shows each day's sum of available recipe energy values, not consumed calories or a recommended daily target. Missing nutrition is never treated as zero; a partial sum is marked with an asterisk. Meal cards show only time/title and completion; selecting a meal opens carbohydrate/protein/fat and source details.

Optional `exerciseWindows` contains one `{day,start,end}` per weekday (0=Monday). Missing windows use waking hours for backward compatibility. Python generation and Java save validation enforce these windows; the UI preview mirrors them. Windows must fit waking hours and the exercise duration. A fully occupied window omits the workout with a notice rather than moving it outside availability. Selected exercise days are also enforced when manually editing saved schedules. Availability is persisted in the existing JSON payload; no additional database column is needed.

Python scheduling tests cover fixed-time conflicts, full-day commitments, invalid dates and Spring time serialization. Java tests cover conflict rejection, user-scoped repository calls, stale revisions and JSON date/time round trips. Local browser checks use sample data for generation/edit/completion/save/week navigation and mobile overflow. A real Gemini request was tested with synthetic inputs. End-to-end persistence against a live application PostgreSQL database is not yet verified.

The first version supports Monday-based weeks and same-day waking/sleeping schedules in Korean wall-clock time; overnight shifts require a later extension. It does not read Google Calendar, calculate clinical nutrition targets, or automatically use weight/medical history. It uses explicitly entered preferences and restrictions. Generated nutrition/activity content still needs user review, especially for allergies or clinician-imposed restrictions; prompt instructions are not a clinical safety guarantee. The model can fail; failures do not replace saved plans. Drafts are not durable until explicitly saved.
