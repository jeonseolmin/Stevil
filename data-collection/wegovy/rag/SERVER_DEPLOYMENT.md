# Server migration — 2026-09-02

Host: `ubuntu@15.165.242.94`. Existing application: `/home/ubuntu/Stevil`.

## Applied

- Built `stevil-postgres:17-pgvector-0.8.6` from the exact existing PostgreSQL image digest `postgres@sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193`.
- Updated only the PostgreSQL image in the server's existing `compose.yaml` and recreated that service. Existing `stevil_postgres-data` volume is retained.
- Verified that all 20 existing public tables remained present.
- Created `stevil_rag` database and dedicated `stevil_rag_owner` role inside the existing PostgreSQL server. The original application database is separate.
- Imported 286 source sections/pages, 1,372 passage mappings, and 1,232 cached 768-dimensional embeddings without generating them again.
- Started `stevil-rag-rag-api-1` from `stevil-rag-api:local`. API listens on host loopback `127.0.0.1:8091`; PostgreSQL search uses pgvector cosine distance.
- API is still in development preview mode with unreviewed sources. The production frontend/proxy has NOT been changed to expose this API.

## Paths

- RAG files: `/home/ubuntu/stevil-rag/wegovy`
- Server-only secrets: `/home/ubuntu/stevil-rag/server.env` (mode 600)
- Compose: `/home/ubuntu/stevil-rag/wegovy/rag/compose.server.yaml`
- Pre-migration backup: `/home/ubuntu/stevil-rag/backups/20260902T023152Z/`
  - `postgres-all.sql`: complete logical dump, 38,778 bytes
  - `postgres-all.sha256`: checksum
  - `compose.yaml`: original deployment configuration

The backup contains database contents and role credentials; keep access restricted. A full restore drill has not been performed. Preserve the backup before future modifications.

## Operations (run on server)

```sh
docker compose --env-file /home/ubuntu/stevil-rag/server.env -p stevil-rag -f /home/ubuntu/stevil-rag/wegovy/rag/compose.server.yaml ps
docker compose --env-file /home/ubuntu/stevil-rag/server.env -p stevil-rag -f /home/ubuntu/stevil-rag/wegovy/rag/compose.server.yaml up -d --no-build
curl http://127.0.0.1:8091/api/status
```

Keep the server's PostgreSQL image change when deploying future application changes; replacing its Compose file with the older local file would revert that image. `server_migrate.py` is a one-time guarded migration, not a routine restart command.

If reverting only the PostgreSQL image is needed, use the backed-up Compose configuration with the existing volume after investigating the failure. The original Alpine image has no vector extension, so RAG vector queries will not work after that rollback. Do not delete volumes or restore the dump over a live database without a separate recovery plan.

## Remaining deployment work

Connect the production frontend through an authenticated backend/proxy, add usage limits, and complete source/answer review before exposing the preview API publicly. The existing public frontend and Spring backend continue running independently.
