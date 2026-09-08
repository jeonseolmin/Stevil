import json
import subprocess
from pathlib import Path
from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

opener = build_opener(NoRedirect())
for path, method, headers in [('/api/users/me', 'GET', {}), ('/api/auth/refresh', 'POST', {}), ('/api/users/me', 'GET', {'Authorization': 'Bearer invalid'}), ('/rag-api/status', 'GET', {}), ('/oauth2/authorization/google', 'GET', {}), ('/dashboard', 'GET', {})]:
    try:
        response = opener.open(Request('http://127.0.0.1' + path, method=method, headers=headers), timeout=10)
    except HTTPError as error:
        response = error
    print(method, path, response.code)
    expected = 302 if path.startswith('/oauth2') else 200 if path == '/dashboard' else 401
    assert response.code == expected, (path, response.code)

sql = "SELECT 'users=' || count(*) FROM users; SELECT 'refresh_table=' || count(*) FROM pg_tables WHERE schemaname='public' AND tablename='refresh_tokens';"
result = subprocess.check_output(['docker','exec','stevil-postgres','sh','-c','psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"','sh',sql], text=True)
print(result.strip())
backup = sorted(Path('/home/ubuntu/stevil-rag/backups').glob('auth-*'))[-1]
print('backup=', backup.name, 'bytes=', (backup / 'postgres.sql').stat().st_size)
