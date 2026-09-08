#!/bin/sh
set -eu
ROOT=/home/ubuntu/Stevil
RAG=/home/ubuntu/stevil-rag/wegovy/rag
STAGE=/home/ubuntu/stevil-rag/dashboard-deploy
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP=/home/ubuntu/stevil-rag/backups/dashboard-$STAMP
mkdir -p "$BACKUP"
tar --exclude=node_modules --exclude=dist -czf "$BACKUP/frontend.tar.gz" -C "$ROOT" stevil-frontend
tar -czf "$BACKUP/rag-code.tar.gz" -C "$RAG" app.py hybrid.py postgres_store.py
if [ -f "$RAG/prompts.py" ]; then cp "$RAG/prompts.py" "$BACKUP/prompts.py"; fi
docker tag stevil-frontend stevil-frontend:rollback-$STAMP
docker tag stevil-rag-api:local stevil-rag-api:rollback-$STAMP
printf '%s\n' "$BACKUP" > "$STAGE/last-backup"
tar -xzf "$STAGE/dashboard.tar.gz" -C "$ROOT/stevil-frontend"
tar -xzf "$STAGE/rag-code.tar.gz" -C "$RAG"
python3 - "$ROOT/stevil-frontend/nginx.conf" "$STAGE/nginx-rag.conf.fragment" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
s = p.read_bytes()
fragment = Path(sys.argv[2]).read_bytes().replace(b'\r\n', b'\n')
if b'location /rag-api/' not in s:
    assert b'    location / {' in s
    s = s.replace(b'    location / {', fragment + b'\n    location / {')
if b'limit_req_zone' not in s:
    s = b'limit_req_zone $binary_remote_addr zone=rag_requests:10m rate=6r/m;\n\n' + s
p.write_bytes(s)
PY
docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" build rag-api
cd "$ROOT"
docker compose build frontend
docker run --rm --network stevil_default --entrypoint nginx stevil-frontend -t
docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" up -d --no-deps rag-api
docker compose up -d --no-deps frontend
printf 'DEPLOYED backup=%s\n' "$BACKUP"
