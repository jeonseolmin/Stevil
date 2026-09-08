#!/bin/sh
set -eu
cd /home/ubuntu/Stevil
STAGE=/home/ubuntu/stevil-rag/dashboard-deploy
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP=/home/ubuntu/stevil-rag/backups/auth-$STAMP
mkdir -m 700 "$BACKUP"
tar -czf "$BACKUP/backend.tar.gz" --exclude=build --exclude=.gradle -C /home/ubuntu/Stevil stevil-backend
cp compose.yaml "$BACKUP/compose.yaml"
docker exec stevil-postgres sh -c 'pg_dumpall -U "$POSTGRES_USER"' > "$BACKUP/postgres.sql"
chmod 600 "$BACKUP/postgres.sql"
docker tag stevil-backend stevil-backend:auth-rollback-$STAMP
docker tag stevil-frontend stevil-frontend:auth-rollback-$STAMP
tar -xzf "$STAGE/backend-code.tar.gz" -C stevil-backend
tar -xzf "$STAGE/dashboard.tar.gz" -C stevil-frontend
python3 - <<'PY'
from pathlib import Path
p = Path('stevil-backend/src/main/resources/application-prod.yaml')
s = p.read_text()
s = s.replace('ddl-auto: create', 'ddl-auto: update')
p.write_text(s)
p = Path('stevil-backend/src/main/resources/application.yaml')
s = p.read_text()
if 'access-expiration:' not in s:
    assert '  jwt:' in s
    s = s.replace('  jwt:', '  jwt:\n    access-expiration: 1800000\n    refresh-expiration: 1209600000')
p.write_text(s)
PY
docker compose build backend frontend
echo BUILD_READY
