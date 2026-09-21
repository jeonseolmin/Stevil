# AI services

The Python AI runtimes Stevil actually calls at request time, as opposed to
the one-off data-collection/preprocessing scripts elsewhere in
`data-collection/`.

| Service | Path | Port | Runtime | Production |
|---|---|---|---|---|
| RAG + Planner | `ai-services/rag` | 8091 | Python (stdlib `http.server`, no framework) | Docker (`rag-api` container, `deploy/compose.server.yaml`) |
| Diet AI Coach | `ai-services/diet` | 8092 | Python (FastAPI/uvicorn) | systemd (`diet-ai.service`) |

Both are reached through nginx by container/service name + port
(`http://rag-api:8091`, `http://host.docker.internal:8092`) — not by
filesystem path — so moving these folders never requires an nginx change on
its own.

`rag/planner/` is the meal/exercise planner generator that
`PlannerService.java` calls; it is not a separate top-level service, it's
part of the RAG server's own codebase and moves with it.

## History

Both services used to live as `data-collection/wegovy/rag/` and
`data-collection/diet/` respectively. They were moved here (Python AI runtime
migration) to separate the services Stevil actually runs from the raw
data-collection scripts in the rest of this directory; `wegovy/`'s own
scraping/preprocessing code (`collect.py`, `sources.json`, `raw/`, `runs/`)
stayed where it was, since the RAG server still reads that data directly
(see `ai-services/rag/app.py`'s `ROOT`).
