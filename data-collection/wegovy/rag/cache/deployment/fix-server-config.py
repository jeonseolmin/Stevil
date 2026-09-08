from pathlib import Path
import re
p = Path('/home/ubuntu/Stevil/stevil-backend/src/main/resources/application-prod.yaml')
s = p.read_text()
s, count = re.subn(r'\$\{\s+FRONTEND_URL\}', '${FRONTEND_URL}', s)
assert count == 1, count
p.write_text(s)
print('Fixed malformed FRONTEND_URL placeholder')
