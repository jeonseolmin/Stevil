"""Collect a small source-backed optional snack catalog; no invented product nutrition."""
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, unquote
from urllib.request import urlopen
from nutrition_catalog import ENDPOINT, SOURCE, FIELDS, ROOT, grams, nutrient_text, digest, parse_page
from nutrition import number, recipe_nutrition


def candidate(row, retrieved):
    title=str(row.get('FOOD_NM_KR',''))
    basis=grams(row.get('SERVING_SIZE'))
    nutrients={k:nutrient_text(row.get(v,'')) for k,v in FIELDS.items()}
    n=recipe_nutrition({'INFO_WGT':basis,**nutrients})
    if not n or not row.get('FOOD_CD'): return None
    kind=None; amount=0
    if '쉐이크' in title and re.search('단백|프로틴',title) and n['protein']*100/basis>=35:
        kind='shake';amount=30
    elif ('닭가슴살' in title and re.search('삶은|찐|스팀|수비드|훈제',title)
          and not re.search('샌드|샐러드|볶음밥|김밥|소시지|핫도그|만두',title)):
        kind='chicken';amount=50
    elif re.search('달걀|계란',title) and re.search('삶은',title) and not re.search('흰자|노른자|난황|난백|샐러드|샌드|국수',title):
        kind='egg';amount=50
    if kind is None: return None
    scaled={k:format(number(v)*amount/basis,'.4f') if v else '' for k,v in nutrients.items()}
    if float(scaled['INFO_PRO'])<5: return None
    component={'foodId':str(row['FOOD_CD']),'name':title,'role':'snack','sourceUrl':SOURCE,
               'retrievedAt':retrieved,'basisWeight':str(basis),'servingWeight':str(amount),
               'nutrition':nutrients,'amountNutrition':scaled,'fingerprint':digest(row)}
    evidence={'recipeId':'snack:'+digest(component)[:24],'sourceUrl':SOURCE,'retrievedAt':retrieved,
              'ingredients':f'{title} {amount}g','servingWeight':str(amount),
              'nutrition':scaled,'fingerprint':digest(component),'components':[component]}
    return {'id':evidence['recipeId'],'category':kind,'title':title[:60],
            'note':'제품 자체 30g 기준이며 섞는 우유·음료는 포함하지 않습니다.' if kind=='shake' else '먹는 부분의 중량 기준입니다. 제품·조리법에 따라 달라질 수 있어요.',
            'foodEvidence':evidence}


def collect():
    key=os.environ.get('FOOD_NUTRITION_API_KEY','')
    if not key: raise ValueError('FOOD_NUTRITION_API_KEY가 필요합니다.')
    retrieved=datetime.now(timezone.utc).isoformat(); raw={}
    for term in ['쉐이크','닭가슴살','달걀','삶은계란']:
        for page in range(1,31):
            query=urlencode(dict(serviceKey=unquote(key),pageNo=page,numOfRows=500,type='json',FOOD_NM_KR=term))
            with urlopen(ENDPOINT+'?'+query,timeout=45) as response: rows,total=parse_page(json.load(response))
            if not rows and total: raise ValueError('간식 API 페이지가 비었습니다.')
            raw.update({str(r['FOOD_CD']):r for r in rows})
            if page*500>=total: break
        else: raise ValueError('간식 수집 상한에 도달했습니다.')
    publish(raw,retrieved)


def publish(raw,retrieved):
    selected=[]
    for kind in ['shake','chicken','egg']:
        choices=[c for row in raw.values() if (c:=candidate(row,retrieved)) and c['category']==kind]
        # Prefer generic source entries where possible, then less sodium; no brand endorsement.
        choices.sort(key=lambda c:('브랜드' in c['title'],len(c['title']),float(c['foodEvidence']['nutrition']['INFO_NA'] or 'inf')))
        seen=set()
        for c in choices:
            if c['title'] in seen: continue
            seen.add(c['title']);selected.append(c)
            if len(seen)==2: break
        if not seen: raise ValueError('영양 기준을 확인한 간식 후보가 부족합니다: '+kind)
    ROOT.mkdir(exist_ok=True)
    (ROOT/'snack-source.json').write_text(json.dumps({'retrievedAt':retrieved,'rows':list(raw.values())},ensure_ascii=False),encoding='utf-8')
    destination=Path(__file__).resolve().parents[3]/'stevil-backend/src/main/resources/planner/snacks.json'
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(selected,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Collected snack candidates:',len(selected),[c['category'] for c in selected])


if __name__=='__main__':
    from app import load_env
    load_env()
    try:
        import sys
        if '--refresh' in sys.argv:
            data=json.loads((ROOT/'snack-source.json').read_text(encoding='utf-8'))
            publish({str(r['FOOD_CD']):r for r in data['rows']},data['retrievedAt'])
        else: collect()
    except Exception as error:
        print('Snack collection failed:',type(error).__name__)
        raise SystemExit(1)
