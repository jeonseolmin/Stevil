from pathlib import Path
import re
root=Path('stevil-frontend/src')
groups={
 'primary':['#3abdb1','#20bfa9','#159987','#128f82'],
 'primary-dark':['#0f7d72','#118777','#10463f'],
 'primary-light':['#83ded2','#91e5d9','#78ddd1'],
 'primary-soft':['#e8f8f5','#ddf4ef','#dff5f1','#e2f6f1','#d9eeea'],
 'background':['#f8faf9','#f4f8f7','#f5faf9'],
 'surface-soft':['#f1f7f5','#edf3f1','#f1f6f5','#edf4f2'],
 'text-primary':['#183a37','#173c38','#294944','#173f39','#183c37'],
 'text-secondary':['#526966','#617773','#47625e'],
 'text-muted':['#7d918e','#718783','#829490'],
 'border':['#dce9e6','#dce8e6','#dcebe8'],
 'border-light':['#e8f0ee','#e7efed','#e4edeb'],
}
mapping={color:f'var(--color-{token})' for token,colors in groups.items() for color in colors}
changed=[]
for p in root.rglob('*.css'):
 if p.name=='theme.css' or 'preview' in p.parts: continue
 old=p.read_text(encoding='utf-8')
 new=re.sub(r'#[0-9a-fA-F]{3,8}\b',lambda m:mapping.get(m[0].lower(),m[0]),old)
 for rgb in ['32, 191, 169','18, 143, 130','58, 189, 177','21, 153, 135']:
  new=new.replace('rgba('+rgb+',','rgba(57, 135, 106,')
 if new!=old:
  p.write_text(new,encoding='utf-8');changed.append(str(p))
print('Updated palette in',len(changed),'stylesheets')
