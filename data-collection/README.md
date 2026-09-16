# data-collection

```
data-collection/
├─ ai-services/   # Python services Stevil actually calls at request time
│  ├─ rag/        # RAG + Planner runtime, port 8091 (Docker)
│  └─ diet/       # AI Diet Coach, port 8092 (systemd)
│
├─ wegovy/        # Wegovy source scraping + review (collect.py, raw/, runs/, sources.json)
│                  # — rag/'s own app.py reads this data directly, see ai-services/README.md
└─ DB/            # Shared reference data (e.g. exercises.csv, used by ai-services/rag's Docker build)
```

See `ai-services/README.md` for the AI runtimes' ports/production details,
and each service's own `README.md` for how to run it locally.
