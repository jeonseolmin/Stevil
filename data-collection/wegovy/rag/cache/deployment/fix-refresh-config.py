from pathlib import Path
root = Path('/home/ubuntu/Stevil')
p = root / 'compose.yaml'
s = p.read_text()
if 'SPRING_JWT_REFRESH_EXPIRATION:' not in s:
    assert '      SPRING_PROFILES_ACTIVE: prod' in s
    s = s.replace('      SPRING_PROFILES_ACTIVE: prod', '      SPRING_PROFILES_ACTIVE: prod\n      SPRING_JWT_REFRESH_EXPIRATION: 1209600000')
p.write_text(s)
p = root / 'stevil-backend/src/main/resources/application.yaml'
s = p.read_text()
if 'refresh-expiration:' not in s:
    s = s.replace('  jwt:', '  jwt:\n    refresh-expiration: 1209600000')
p.write_text(s)
print('Added refresh token expiration (14 days)')
