"""Explicit user goals and deterministic recipe-portion matching."""
from itertools import combinations
import math


def number(value):
    try:
        n=float(value)
        return n if math.isfinite(n) and n>=0 else None
    except (ValueError,TypeError): return None


def validate_goal(goal):
    if not goal: return None
    for key,low,high in [('weightKg',20,350),('proteinPerKg',0.1,3),('calories',1000,5000)]:
        value=number(goal.get(key))
        if isinstance(goal.get(key),bool) or value is None or not low<=value<=high:
            raise ValueError('체중·단백질 기준·목표 열량을 확인해 주세요.')
    if goal.get('confirmed') is not True:
        raise ValueError('성인 일반 식사 목표이며 제한 사항을 확인했다는 확인이 필요합니다.')
    protein=goal['weightKg']*goal['proteinPerKg']
    if protein*4>goal['calories']*.35:
        raise ValueError('단백질 목표가 열량의 35%를 넘습니다. 설정을 전문가와 확인해 주세요.')
    return {'calories':float(goal['calories']),'protein':round(protein,1)}


def recipe_nutrition(row):
    weight=number(row.get('INFO_WGT'))
    values=[number(row.get(key)) for key in ('INFO_ENG','INFO_CAR','INFO_PRO','INFO_FAT')]
    if not weight or any(v is None for v in values) or values[0]<=0: return None
    kcal,carbs,protein,fat=values
    # Reject obvious source inconsistencies; do not invent or replace missing values.
    if carbs+protein+fat>weight or abs(carbs*4+protein*4+fat*9-kcal)>max(30,kcal*.3): return None
    return {'calories':kcal,'carbs':carbs,'protein':protein,'fat':fat,'weight':weight}


def match_week(rows,goal):
    target=validate_goal(goal)
    eligible=[(row,recipe_nutrition(row)) for row in rows]
    eligible=[item for item in eligible if item[1] is not None]
    if len(eligible)<3: raise ValueError('중량과 영양정보를 확인할 수 있는 메뉴가 부족합니다.')
    options=[]
    for combo in combinations(eligible,3):
        kcal=sum(n['calories'] for _,n in combo);protein=sum(n['protein'] for _,n in combo)
        score=abs(kcal-target['calories'])/target['calories']+abs(protein-target['protein'])/target['protein']
        components=[key for row,_ in combo for key in row.get('_componentIds',[])]
        score+=.04*(len(components)-len(set(components)))
        options.append((score,combo,kcal,protein))
    usage={};component_usage={};days=[];notices=[]
    for day in range(7):
        score,combo,kcal,protein=min(options,key=lambda item:item[0]+.10*sum(usage.get(str(r['RCP_SEQ']),0) for r,_ in item[1])+.02*sum(component_usage.get(k,0) for r,_ in item[1] for k in r.get('_componentIds',[])))
        for row,_ in combo:
            usage[str(row['RCP_SEQ'])]=usage.get(str(row['RCP_SEQ']),0)+1
            for key in row.get('_componentIds',[]): component_usage[key]=component_usage.get(key,0)+1
        # Smaller-energy meal first; keep the entire source portion unchanged.
        days.append([row for row,_ in sorted(combo,key=lambda item:item[1]['calories'])])
        notices.append(f'{day+1}일차 추천 조합(배치 전): {kcal:.0f} kcal / 단백질 {protein:.1f} g (목표 대비 {kcal-target["calories"]:+.0f} kcal / {protein-target["protein"]:+.1f} g). 각 식사에 표시된 기준량·제안량이며 실제 조리량을 확인해 주세요.')
    return days,notices
