"""Run on the authorized Ubuntu host after building both images.
Preserves the existing database volume. Never logs credentials.
"""
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

os.umask(0o077)
BASE = Path('/home/ubuntu/stevil-rag')
COMPOSE = Path('/home/ubuntu/Stevil/compose.yaml')
IMAGE = 'stevil-postgres:17-pgvector-0.8.6'

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def output(args):
    return subprocess.check_output(args, text=True).strip()

if __name__ == '__main__':
    inspect = json.loads(output(['docker','inspect','stevil-postgres']))[0]
    environment = dict(item.split('=',1) for item in inspect['Config']['Env'] if '=' in item)
    user = environment['POSTGRES_USER']
    database = environment.get('POSTGRES_DB', user)
    psql = ['docker','exec','-i','stevil-postgres','psql','-v','ON_ERROR_STOP=1','-U',user]
    before_tables = output(psql + ['-d',database,'-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"])
    original = COMPOSE.read_text()
    if original.count('image: postgres:17-alpine') != 1:
        raise RuntimeError('Unexpected compose image; inspect before continuing')
    run(['docker','image','inspect',IMAGE], stdout=subprocess.DEVNULL)
    backup = BASE / 'backups' / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup.mkdir(parents=True)
    (backup/'compose.yaml').write_text(original)
    with (backup/'postgres-all.sql').open('wb') as destination:
        run(['docker','exec','stevil-postgres','pg_dumpall','-U',user], stdout=destination)
    dump = backup/'postgres-all.sql'
    if dump.stat().st_size < 100: raise RuntimeError('Empty backup')
    (backup/'postgres-all.sha256').write_text(hashlib.sha256(dump.read_bytes()).hexdigest())
    print('Backup saved:', backup, 'bytes:', dump.stat().st_size, flush=True)
    COMPOSE.write_text(original.replace('image: postgres:17-alpine','image: '+IMAGE))
    try:
        run(['docker','compose','-f',str(COMPOSE),'up','-d','--no-deps','postgres'])
        for attempt in range(30):
            check = subprocess.run(['docker','exec','stevil-postgres','pg_isready','-U',user], stdout=subprocess.DEVNULL)
            if check.returncode == 0: break
            time.sleep(1)
        else: raise RuntimeError('Postgres did not become ready')
        after_tables = output(psql + ['-d',database,'-Atc',"SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"])
        if before_tables != after_tables: raise RuntimeError('Existing table count changed')
    except Exception:
        COMPOSE.write_text(original)
        run(['docker','compose','-f',str(COMPOSE),'up','-d','--no-deps','postgres'])
        raise
    existing = output(psql + ['-d',database,'-Atc',"SELECT count(*) FROM pg_database WHERE datname='stevil_rag'"])
    if existing != '0': raise RuntimeError('RAG database exists; inspect before importing')
    password = secrets.token_hex(32)
    sql = f"CREATE ROLE stevil_rag_owner LOGIN PASSWORD '{password}';\nCREATE DATABASE stevil_rag OWNER stevil_rag_owner;\n"
    run(psql + ['-d',database], input=sql, text=True, stdout=subprocess.DEVNULL)
    run(psql + ['-d','stevil_rag'], input='CREATE EXTENSION vector;\n', text=True, stdout=subprocess.DEVNULL)
    env_path = BASE/'server.env'
    lines = [line for line in env_path.read_text(encoding='utf-8-sig').splitlines() if not line.startswith('RAG_DATABASE_URL=')]
    lines.append(f'RAG_DATABASE_URL=postgresql://stevil_rag_owner:{password}@stevil-postgres:5432/stevil_rag')
    env_path.write_text('\n'.join(lines)+'\n')
    env_path.chmod(0o600)
    compose = ['docker','compose','--env-file',str(env_path),'-p','stevil-rag','-f',str(BASE/'wegovy/rag/compose.server.yaml')]
    run(compose + ['run','--rm','--no-deps','rag-api','python','postgres_store.py','--preview'])
    run(compose + ['up','-d','--no-build','rag-api'])
    print('Existing public tables preserved:', after_tables)
    print('RAG data migrated; API bound to host loopback port 8091.')
