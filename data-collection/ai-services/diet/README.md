# Diet AI Coach

FastAPI RAG server behind `AiDietCoach.jsx` (Diet Management page). Frontend
calls `/diet-api/chat` (nginx, port 80) which proxies straight to this
service's `/api/chat` on port 8092 — it does **not** go through the Spring
backend.

## Run

```powershell
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python -m uvicorn ai_server:app --host 0.0.0.0 --port 8092
```

`GEMINI_API_KEY` is read via `python-dotenv`, which searches upward from the
working directory for a `.env` — the repository root `.env` is used in both
local dev and production; see `.env.example`.

## Data pipeline

`ai_server.py` reads a pre-built Chroma vector store at `./chroma_db`
(gitignored, not built by CI). To (re)build it from raw nutrition
spreadsheets:

```
filter_data.py   # filters raw *.xlsx down to high-protein rows -> filtered/
build_db.py      # embeds filtered/*.csv|xlsx into ./chroma_db (rate-limited, slow)
test_db.py        # sanity-checks the built chroma_db (count + a sample search)
chat.py          # interactive CLI chat against chroma_db, for manual testing
```

Embedding costs real Gemini API quota — don't re-run `build_db.py` unless the
source data actually changed. Production's `chroma_db` was built directly on
the server and is not tracked in git (see `.gitignore`).

## Production

Runs as a systemd service (`diet-ai.service`), not Docker — see
`data-collection/ai-services/README.md` for the current path/port table.
