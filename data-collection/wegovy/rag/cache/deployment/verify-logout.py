from urllib.request import Request, build_opener, HTTPRedirectHandler
from urllib.error import HTTPError
from http.cookies import SimpleCookie

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None

opener = build_opener(NoRedirect())
def call(path, method='GET', headers=None):
    try:
        return opener.open(Request('http://127.0.0.1' + path, method=method, headers=headers or {}), timeout=10)
    except HTTPError as error:
        return error

start = call('/oauth2/authorization/google')
assert start.code == 302
cookie = SimpleCookie()
for header in start.headers.get_all('Set-Cookie', []):
    cookie.load(header)
assert 'JSESSIONID' in cookie
session_cookie = 'JSESSIONID=' + cookie['JSESSIONID'].value
logout = call('/api/auth/logout', 'POST', {'Cookie': session_cookie})
assert logout.code == 204, logout.code
deleted = SimpleCookie()
for header in logout.headers.get_all('Set-Cookie', []):
    deleted.load(header)
for name in ('JSESSIONID', 'refreshToken'):
    assert name in deleted and deleted[name]['max-age'] == '0', name
assert call('/api/users/me', headers={'Cookie': session_cookie}).code == 401
assert call('/api/auth/refresh', 'POST', {'Cookie': session_cookie}).code == 401
assert call('/api/auth/logout', 'POST').code == 204
print('PASS: logout 204; session and refresh cookies deleted; old session unauthorized; repeated logout 204')
