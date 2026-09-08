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

## Dashboard deployment (2026-09-02)

The dashboard includes the floating Wegovy assistant. `/wegovy-chat` redirects to `/dashboard?chat=wegovy`. The frontend uses the existing access-token/refresh flow for `/rag-api/` requests. Nginx checks `/api/users/me` before forwarding to the private RAG service and limits requests per IP to 6/minute with a burst of 3. Anonymous access returns 401. Gemini credentials remain on the server.

The production Nginx OAuth routes are preserved. `nginx-rag.conf.fragment` is the RAG server-block fragment; the HTTP context also needs `limit_req_zone $binary_remote_addr zone=rag_requests:10m rate=6r/m;` as shown in the frontend Nginx config. RAG and frontend must share `stevil_default`. Always use `-p stevil-rag` with the RAG Compose file to update the existing service.

Frontend and RAG code/image backups are in `/home/ubuntu/stevil-rag/backups/dashboard-*/`. Deployment only recreates frontend and RAG containers; existing backend and PostgreSQL stay running. Source/answer review is still pending and preview labels remain visible. A complete logged-in browser check requires a user session.

## Authentication compatibility repair

The new frontend requires the cookie-based `/api/auth/refresh` backend; the old backend redirected with a token in the callback URL and was incompatible. Deploy both versions together. API authentication failures must return 401 rather than an HTML login redirect. The header now validates the user response and leaves token rotation to the OAuth callback page during login.

Before the backend upgrade, a database dump and code/config backups were saved under `/home/ubuntu/stevil-rag/backups/auth-*/`. The server's `application-prod.yaml` had `ddl-auto: create` and a malformed multiline `FRONTEND_URL` placeholder; these were corrected to `update` and a single-line placeholder. Never restore `create` when restarting against production data. The server Compose environment now sets `SPRING_JWT_REFRESH_EXPIRATION: 1209600000` (14 days); local application settings already include this value. Preserve these server settings on future deployments.
