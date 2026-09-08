import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

p=dict(weekStart='2026-08-31',wakeTime='07:00',sleepTime='23:00',breakfastTime='08:00',lunchTime='12:30',dinnerTime='18:30',exerciseTime='19:30',exerciseMinutes=30,exerciseDays=[0,2,4],intensity='가볍게',experience='초보',preferences='밥과 채소',allergies='',limitations='',busySlots=[],aiConsent=True,exerciseWindows=[dict(day=0,start='20:00',end='21:00')])
request=Request('http://127.0.0.1:8091/api/plan',data=json.dumps(p).encode(),headers={'Content-Type':'application/json'})
with urlopen(request,timeout=110) as response: result=json.load(response)
catalog=json.loads(Path('/home/ubuntu/stevil-rag/wegovy/rag/cache/food/catalog.json').read_text())
rows={str(r['RCP_SEQ']):r for r in catalog['rows']}
meals=[e for e in result['events'] if e['kind']=='MEAL']
assert len(meals)==21
assert all(e['title']==rows[e['foodEvidence']['recipeId']]['RCP_NM'] for e in meals)
exercise=next(e for e in result['events'] if e['kind']=='EXERCISE' and e['start'].startswith('2026-08-31'))
assert exercise['start'][11:]>='20:00' and exercise['end'][11:]<='21:00'
print('SERVER_GENERATION_OK',len(meals),'source-backed meals; workout window respected')
for path in ['/api/planner?week=2026-08-31','/api/users/me']:
    try: urlopen('http://127.0.0.1'+path,timeout=10)
    except HTTPError as error: assert error.code==401; print('AUTH_REQUIRED',path)
    else: raise AssertionError('Anonymous request accepted')
try:
    urlopen(Request('http://127.0.0.1/api/planner/draft',data=json.dumps(p).encode(),headers={'Content-Type':'application/json'}),timeout=10)
except HTTPError as error: assert error.code==401; print('DRAFT_AUTH_REQUIRED')
else: raise AssertionError('Anonymous generation accepted')
with urlopen('http://127.0.0.1/',timeout=10) as response: assert response.status==200
print('FRONTEND_OK')
