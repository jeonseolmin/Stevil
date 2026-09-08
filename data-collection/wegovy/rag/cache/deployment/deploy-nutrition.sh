#!/bin/sh
set -eu
umask 077
ROOT=/home/ubuntu/Stevil
RAG=/home/ubuntu/stevil-rag/wegovy/rag
STAGE=/home/ubuntu/stevil-rag/nutrition-deploy
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP=/home/ubuntu/stevil-rag/backups/nutrition-$STAMP
cd "$STAGE"
sha256sum -c nutrition-packages.sha256
mkdir -m 700 "$BACKUP"
printf '%s\n' "$BACKUP" > last-backup
printf '%s\n' "$STAMP" > last-stamp
python3 - <<'PY'
from pathlib import Path
p=Path('/home/ubuntu/Stevil/stevil-backend/src/main/resources/application-prod.yaml')
assert 'ddl-auto: update' in p.read_text()
assert 'PLANNER_GENERATOR_URL: http://rag-api:8091/api/plan' in Path('/home/ubuntu/Stevil/compose.yaml').read_text()
PY
tar --exclude=node_modules --exclude=dist --exclude=build --exclude=.gradle -czf "$BACKUP/app.tar.gz" -C "$ROOT" stevil-frontend stevil-backend compose.yaml
tar --exclude=cache -czf "$BACKUP/rag.tar.gz" -C "$RAG" .
docker exec stevil-postgres sh -c 'pg_dumpall -U "$POSTGRES_USER"' > "$BACKUP/postgres.sql"
test -s "$BACKUP/postgres.sql"
docker tag stevil-frontend "stevil-frontend:before-$STAMP"
docker tag stevil-backend "stevil-backend:before-$STAMP"
docker tag stevil-rag-api:local "stevil-rag-api:before-$STAMP"
echo "BACKUP_READY $BACKUP"
tar -xzf nutrition-frontend.tar.gz -C "$ROOT/stevil-frontend"
tar -xzf nutrition-backend.tar.gz -C "$ROOT/stevil-backend"
tar -xzf nutrition-rag.tar.gz -C "$RAG"
chmod 755 "$RAG/cache" "$RAG/cache/food" "$RAG/cache/nutrition"
chmod 644 "$RAG/cache/food/catalog.json" "$RAG/cache/food/embeddings.sqlite3" "$RAG/cache/nutrition/foods.sqlite3" "$RAG/cache/nutrition/embeddings.sqlite3"
# Uploaded source files must also be readable by the non-root RAG image user.
find "$RAG" -maxdepth 1 -type f -name '*.py' -exec chmod 644 {} +
cd "$ROOT"
docker compose build backend frontend > "$STAGE/build-app.log" 2>&1 || { tail -n 35 "$STAGE/build-app.log"; exit 1; }
docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" build rag-api > "$STAGE/build-rag.log" 2>&1 || { tail -n 35 "$STAGE/build-rag.log"; exit 1; }
docker run --rm --network stevil_default --entrypoint nginx stevil-frontend -t
docker run --rm --entrypoint python stevil-rag-api:local -m unittest test_nutrition_catalog test_nutrition test_food_catalog test_planner
docker run --rm --entrypoint python stevil-rag-api:local -c 'from nutrition_catalog import NutrientCatalog; c=NutrientCatalog(); assert len(c.rows)==279 and c.index.ready; print("NUTRIENT_INDEX_READY",len(c.rows))'
echo BUILD_VERIFIED
activated=no
rollback() {
    status=$?
    if [ "$status" -ne 0 ] && [ "$activated" = yes ]; then
        docker tag "stevil-frontend:before-$STAMP" stevil-frontend
        docker tag "stevil-backend:before-$STAMP" stevil-backend
        docker tag "stevil-rag-api:before-$STAMP" stevil-rag-api:local
        docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" up -d --no-deps rag-api
        docker compose up -d --no-deps backend frontend
        echo ROLLED_BACK
    fi
    exit "$status"
}
trap rollback EXIT
activated=yes
docker compose -p stevil-rag --env-file /home/ubuntu/stevil-rag/server.env -f "$RAG/compose.server.yaml" up -d --no-deps rag-api
docker compose up -d --no-deps backend
code=000
for attempt in $(seq 1 50); do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/api/users/me || true)
    [ "$code" = 401 ] && break
    sleep 2
done
test "$code" = 401
docker compose up -d --no-deps frontend
curl --fail --silent http://127.0.0.1:8091/api/status > /dev/null
curl --fail --silent http://127.0.0.1/ > /dev/null
echo "DEPLOYED backup=$BACKUP"
