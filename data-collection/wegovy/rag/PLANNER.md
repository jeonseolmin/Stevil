# Weekly lifestyle planner

## Local nutrient DB and composed meals — 2026-09-03

Generation error fix: some source sodium strings contain thousands separators (e.g. `1,130.000`). The earlier importer preserved them, Python treated them as missing during scaling, and Spring rejected the component's raw numeric text. `nutrient_text` now removes only correctly grouped separators; unknown/malformed amounts remain missing. All 12,109 stored rows were revalidated without changing the 279-food eligibility set or embeddings. A real affected meal is retained as a contract fixture: the previous grouped response is rejected, the corrected response passes HTTP/JSON/bean/meal validation, and the same user can retry immediately after a failed generation. Spring now distinguishes connection, upstream-response and validation failures; logs contain only stage and exception class, never user/model payloads. Restart Spring to load this error handling; the normalized SQLite data is read on each new RAG request.

Follow-up fix: the actual listener on 8091 was an older `app.py --preview` process, so newly started processes did not replace the serving code. The old listener and duplicate launches were stopped and one updated instance was verified as the port owner. HTTP generation without a nutrition goal now returned 21 distinct meal titles, including five nutrient compositions. The additional catalog is now used in ordinary planning as well as goal matching; ordinary mode uses explicit proposed amounts of 200g staple, 100g protein dish, and 80g vegetables without inventing daily targets. Shortlists now take up to 12 foods per role, balance cooking categories and collapse underscore-suffixed variants into one family. The UI reports the actual composition/recipe counts after generation. Saved plans are not automatically replaced and production is still unchanged. The older 8-per-role and goal-only descriptions below are superseded by this fix.

The additional source is [MFDS FoodNtrCpntDbInfo02](https://www.data.go.kr/data/15127578/openapi.do). Its official Swagger describes `FOOD_CD`, `FOOD_NM_KR`, `SERVING_SIZE`, `AMT_NUM1/3/4/6/13` as identity, name, nutrient reference amount, energy/protein/fat/carbohydrate/sodium. Collection uses HTTPS, the server-only `FOOD_NUTRITION_API_KEY` in `rag/.env`, and API page size 500 (the live endpoint rejects 1000). This key is separate from `FOOD_SAFETY_API_KEY`. Never put either key in the frontend. The user's new key was moved from frontend `.env` into the RAG `.env` without printing it.

Run from this directory with the repository Python venv:

```powershell
../.venv/Scripts/python.exe nutrition_catalog.py --collect --build-index
```

The importer selects seven food categories (rice, grilled, steamed, braised, stir-fried, cooked vegetable, seasoned vegetable), not the entire 319,060-record API. Pages are committed to `cache/nutrition/collecting.sqlite3` and resumed on retry; the active `foods.sqlite3` is replaced only on completion. Raw rows, exclusion reasons, normalized nutrients, source fingerprints and collection date are retained. On normalization changes, use `--revalidate --build-index` to recalculate eligibility from existing raw rows without downloading again.

Local collection: 12,109 unique source records. Final eligible set: 279 prepared foods (12 staples, 167 protein dishes, 100 vegetable dishes). Only `DB_GRP_NM=음식` records with explicit gram reference amounts and plausible complete energy/macros are eligible. Raw ingredients, processed products, missing/volume-only reference amounts and incomplete/inconsistent macros are excluded. Dish-role classification is a conservative menu heuristic, not verified allergen or clinical metadata; seafood/meat mixtures are excluded from vegetable roles. Missing sodium remains missing. Source rows are never attached to existing recipes by name similarity.

The separate Gemini 768-dimensional index is complete. Goal-based generation retrieves up to eight foods per role, proposes gram amounts from bounded ranges (rice 150/200/250g, protein dish 75/100/125g, vegetable dish 60/80/100g), and ranks combinations against one third of the entered daily calorie/protein targets. These are proposed portions, **not** source-reported servings or prescribed intake. Candidates combine up to 24 composed meals with up to 16 existing recipes. Gemini can veto entire candidates for preferences/restrictions; deterministic selection then balances daily target error and repeated meals/components. Repetition penalties apply within the generated week; previous saved weeks are not yet used as history. No exact target or unique weekly menu guarantee is made.

Each composed meal retains three `foodEvidence.components`, their original per-reference nutrition, proposed gram weights and scaled nutrition. Spring validates the scaling and aggregate totals before saving; existing recipe payloads without components still deserialize. The React detail panel shows each food, proposed amount, reference amount and source link. Summary totals use the displayed amounts, and the completed-meal card follows the selected/checkmarked date. Completion counts include meals without nutrients; their nutrients are not imputed.

Verified: Python normalization, response parsing, SQLite round-trip, scaling and prior planner tests; Java component JSON persistence, totals rejection and legacy compatibility; actual Gemini draft with 21 meals (14 compositions, 20 distinct meal IDs); browser rendering of that real draft with mocked API save/reload, completion and 390px layout. Live authenticated PostgreSQL save was not exercised. Frontend build and changed-component lint passed. This remains a local change: restart the IntelliJ Spring application to load the new records/validation. Production is unchanged. Both `cache/food` and `cache/nutrition` must be provisioned with a future deployment; caches and keys are ignored by Git. Food catalogs are local SQLite; saved user calendars continue using the application PostgreSQL database.

The older recipe-only notes below describe the original mode; nutrient compositions additionally support proportional gram scaling as described above.

Local timing update (2026-09-03): the separate duration and preferred exercise time inputs are removed. Each weekday's start/end now defines the complete workout interval (10–90 minutes), not a flexible availability envelope. New UI defaults are 19:30–20:00. A conflicting full interval is omitted with a notice, never shortened or moved outside it. Legacy API records without windows retain the stored exerciseMinutes fallback; UI fills missing windows before submitting. Old wide windows must be narrowed before generating/saving. These rules supersede the earlier availability-envelope description below. Gemini receives actual per-day durations.

## Local nutrition-target update — 2026-09-03 (not deployed)

`GET /api/planner/profile` reads the authenticated user's latest non-future measurement from the actual `user_weight` table (recordedAt descending, then ID descending), alongside height, age calculated in Asia/Seoul, and sex. It never writes body records. New plans prefill measured weight and mark targets unconfirmed; saved plan overrides are preserved and offer an explicit latest-record apply button. Missing profile values stay missing. Profile lookup failures do not prevent manually entering a plan.

When height/age/sex are available, the UI offers a Mifflin–St Jeor resting-energy estimate multiplied by an explicitly selectable activity factor (1.4/1.6/1.8). This is a maintenance estimate, not a prescribed deficit. Supported automatic-calculation age range is 19–78; unknown sex, missing fields, or out-of-range values fall back to manual calories. Editing weight updates calories only in automatic mode; manually editing calories disables automatic replacement. Current plan saves the final target numbers, not a live link to changing body measurements. Equation reference: https://pubmed.ncbi.nlm.nih.gov/2305711/ . Activity choice is a user-selected approximation, not a measured expenditure or a term from the original resting-energy equation.

Optional `nutritionGoal` stores `weightKg`, `proteinPerKg`, `calories`, and `confirmed` in the existing plan payload. Protein target is the user-confirmed weight × g/kg value. The editable 0.8 g/kg starting value is a general adult reference, not a weight-loss/GLP-1 prescription or an individualized recommendation for obesity. Calorie targets must be entered; weight alone is not used to infer energy requirements. UI asks users to confirm adult/general-nutrition applicability, excluding pregnancy/lactation and conditions requiring individualized nutrition prescriptions. Technical input limits are not recommended intake ranges.

References: https://www.ncbi.nlm.nih.gov/books/NBK208874/ and https://www.niddk.nih.gov/health-information/weight-management/healthy-eating-physical-activity-for-life/health-tips-for-adults . Macro percentages use 4/4/9 energy weights and exclude missing/inconsistent source fields. Food API declares INFO_WGT as one-person serving weight; matching uses only records with a positive declared weight and full, arithmetically plausible nutrients. No missing weight is inferred and no portions/ingredients are scaled. Source analytical accuracy is not independently verified.

Target flow: semantic retrieval → complete-nutrition candidate filtering → Gemini excludes candidates inconsistent with preferences/restrictions → deterministic combinations of three distinct recipes ranked by relative calorie/protein error, with a small repeat penalty across days. It does not guarantee exact targets, diverse meals across the whole week, clinical suitability, or an optimal nutrient balance. Every day reports target differences for the proposed combination before scheduling. Final UI totals use only actually scheduled meals; unavailable scheduling slots still produce omission notices. Existing allergy blocking is preserved. Weight and target numbers are not sent to Gemini, only a matching-mode flag.

Today's card distinguishes all planned meals from completion-checked meals (not a dietary-intake log), includes energy-based macro proportions and partial-data labeling. Other weeks do not contain today's meals. Saved targets are snapshots and do not automatically track later weight changes. The nutrition-target update requires new Spring/Python code; production remains at the 2026-09-02 deployment below.

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
