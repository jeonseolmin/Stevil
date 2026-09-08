import json
import re
import sqlite3
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root=Path('/home/ubuntu/stevil-rag/wegovy/rag')
with sqlite3.connect(root/'cache/nutrition/foods.sqlite3') as db:
    rows={r['id']:r for value, in db.execute('SELECT normalized FROM foods WHERE normalized IS NOT NULL') for r in [json.loads(value)]}
assert len(rows)==279
p=dict(weekStart='2026-09-07',wakeTime='07:00',sleepTime='23:00',breakfastTime='08:00',lunchTime='12:30',dinnerTime='18:30',exerciseTime='19:30',exerciseMinutes=30,
       exerciseDays=[0,2,4],intensity='가볍게',experience='초보',preferences='한식, 다양한 메뉴',allergies='',limitations='',busySlots=[],aiConsent=True,
       exerciseWindows=[dict(day=d,start='19:30',end='20:00') for d in [0,2,4]],
       nutritionGoal=dict(weightKg=70,proteinPerKg=1,calories=1800,confirmed=True))
request=Request('http://127.0.0.1:8091/api/plan',data=json.dumps(p).encode(),headers={'Content-Type':'application/json'})
with urlopen(request,timeout=110) as response: result=json.load(response)
meals=[e for e in result['events'] if e['kind']=='MEAL']
composed=[e for e in meals if e['foodEvidence'].get('components')]
assert len(meals)==21 and composed
for e in composed:
    evidence=e['foodEvidence']; parts=evidence['components']
    assert {c['role'] for c in parts}=={'staple','protein','vegetable'}
    for c in parts:
        row=rows[c['foodId']]
        assert c['nutrition']==row['nutrition'] and c['fingerprint']==row['fingerprint']
        for key,raw in c['nutrition'].items():
            value=c['amountNutrition'][key]
            if not raw: assert key=='INFO_NA' and value==''; continue
            assert re.fullmatch(r'[0-9]+(?:\.[0-9]+)?',raw)
            assert abs(float(raw)*float(c['servingWeight'])/float(c['basisWeight'])-float(value))<.001
    for key,total in evidence['nutrition'].items():
        values=[c['amountNutrition'][key] for c in parts]
        if '' in values: assert key=='INFO_NA' and total==''
        else: assert abs(sum(map(float,values))-float(total))<.02
for e in result['events']:
    if e['kind']=='EXERCISE': assert e['start'][11:]=='19:30' and e['end'][11:]=='20:00'
Path('/home/ubuntu/stevil-rag/nutrition-deploy/verified-draft.json').write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
print('GENERATION_OK',json.dumps(dict(meals=len(meals),composed=len(composed),uniqueMenus=len({e['title'] for e in meals}))))
for path in ['/api/users/me','/api/planner?week=2026-09-07','/api/planner/profile']:
    try: urlopen('http://127.0.0.1'+path,timeout=10)
    except HTTPError as error: assert error.code==401
    else: raise AssertionError('Anonymous endpoint accepted: '+path)
try: urlopen(Request('http://127.0.0.1/api/planner/draft',data=json.dumps(p).encode(),headers={'Content-Type':'application/json'}),timeout=10)
except HTTPError as error: assert error.code==401
else: raise AssertionError('Anonymous draft accepted')
with urlopen('http://127.0.0.1/',timeout=10) as response: html=response.read().decode()
asset=re.search(r'src="(/assets/[^" ]+\.js)"',html)[1]
with urlopen('http://127.0.0.1'+asset,timeout=10) as response: javascript=response.read().decode()
assert '끼 중 밥·반찬·채소 조합' in javascript
print('AUTH_AND_FRONTEND_OK',asset)
