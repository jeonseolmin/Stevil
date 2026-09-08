#!/bin/sh
set -eu
ROOT=/home/ubuntu/Stevil
RAG=/home/ubuntu/stevil-rag/wegovy/rag
BACKUP=$(cat /home/ubuntu/stevil-rag/planner-deploy/last-backup)
python3 - <<'PY'
from pathlib import Path
root=Path('/home/ubuntu/Stevil')
p=root/'compose.yaml';s=p.read_text()
if 'PLANNER_GENERATOR_URL:' not in s:
    assert '      SPRING_PROFILES_ACTIVE: prod' in s
    s=s.replace('      SPRING_PROFILES_ACTIVE: prod','      SPRING_PROFILES_ACTIVE: prod\n      PLANNER_GENERATOR_URL: http://rag-api:8091/api/plan')
p.write_text(s)
p=root/'stevil-frontend/nginx.conf';s=p.read_text(encoding='latin-1')
if 'location = /api/planner/draft' not in s:
    s=s.replace('    location /api {','    location = /api/planner/draft {\n        proxy_pass http://backend:8080;\n        proxy_read_timeout 110s;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n    }\n\n    location /api {')
p.write_text(s,encoding='latin-1')
assert 'ddl-auto: update' in (root/'stevil-backend/src/main/resources/application-prod.yaml').read_text()
PY
cd "$ROOT"
docker compose build backend
docker compose build frontend
docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" build rag-api
docker run --rm --network stevil_default --entrypoint nginx stevil-frontend -t
docker run --rm --entrypoint python stevil-rag-api:local -m unittest test_planner test_food_catalog
echo BUILD_VERIFIED
docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" up -d --no-deps rag-api
docker compose up -d --no-deps backend
for attempt in $(seq 1 40); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/users/me || true)
    if [ "$code" = 401 ]; then break; fi
    sleep 2
done
test "$code" = 401
docker compose up -d --no-deps frontend
echo "DEPLOYED backup=$BACKUP"
