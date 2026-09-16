"""Place source-backed snacks and validate the actual seven scheduled days."""
from copy import deepcopy
from datetime import date, timedelta
from pathlib import Path
import json
import uuid
from planner.food.policy import validate_food_policy

from planner.nutrition.matching  import number, validate_goal, balanced_meals, balanced_macros, NutritionTargetUnavailable


def load_snacks():
  import sqlite3

  rag_root = (
    Path(__file__)
    .resolve()
    .parents[2]
  )

  db_path = (
          rag_root
          / "cache"
          / "nutrition"
          / "foods.sqlite3"
  )

  # -----------------------------------------------------
  # 1. DB snack catalog 우선
  # -----------------------------------------------------

  if db_path.exists():
    try:
      with sqlite3.connect(
              db_path
      ) as db:

        exists = db.execute(
          """
          SELECT 1
          FROM sqlite_master
          WHERE type = 'table'
            AND name = 'snacks'
          """
        ).fetchone()

        if exists:
          rows = db.execute(
            """
            SELECT payload
            FROM snacks
            WHERE enabled = 1
            ORDER BY
                category,
                priority,
                title
            """
          ).fetchall()

          snacks = [
            json.loads(payload)
            for payload,
            in rows
          ]

          if snacks:
            return snacks

    except (
        sqlite3.Error,
        ValueError,
        TypeError,
        json.JSONDecodeError,
    ):
      # DB 간식 카탈로그에 문제가 있어도
      # 기존 JSON fallback은 유지합니다.
      pass

  # -----------------------------------------------------
  # 2. 기존 JSON fallback
  # -----------------------------------------------------

  snacks_path = (
          rag_root
          / "config"
          / "snacks.json"
  )

  if not snacks_path.exists():
    return []

  return json.loads(
    snacks_path.read_text(
      encoding="utf-8"
    )
  )

def complete_nutrition(p, result, suggestions):
    validate_food_policy(result['events'])
    target = validate_goal(p.get('nutritionGoal'))
    if not target:
        return result
    def minute(value):
        return int(value[:2])*60 + int(value[3:5])
    def stamp(day, value):
        return f'{day}T{value//60:02d}:{value%60:02d}'
    for index in range(7):
        day = str(date.fromisoformat(p['weekStart']) + timedelta(days=index))
        events = [e for e in result['events'] if e['start'][:10] == day]
        meals = sorted((e for e in events if e['kind'] == 'MEAL'), key=lambda e:e['start'])
        if len(meals) != 3:
            raise NutritionTargetUnavailable(f'{day}: 세 끼를 배치할 시간이 없어 목표 열량을 충족하지 못했습니다. 고정 일정을 조정해 주세요.')
        occupied = [(minute(e['start'][11:]),minute(e['end'][11:])) for e in events]
        occupied += [(minute(s['start']),minute(s['end'])) for s in p.get('busySlots',[]) if s['day']==index and s.get('allowSnacks') is not True]
        planned_snacks = suggestions[index].get('plannedSnacks', [])
        for snack_index, snack in enumerate(planned_snacks):
            slot = None
            gaps = [(meals[snack_index],meals[snack_index+1])] if len(planned_snacks)==2 else [(meals[1],meals[2]),(meals[0],meals[1])]
            for left,right in gaps:
                low = max(minute(left['end'][11:])+30, minute(p['wakeTime']))
                high = min(minute(right['start'][11:])-30, minute(p['sleepTime']))-10
                slot = next((t for t in sorted(range((low+4)//5*5,high+1,5),key=lambda t:abs(t-(low+high)/2))
                             if all(t+10<=a or t>=b for a,b in occupied)),None)
                if slot is not None: break
            if slot is None:
                raise NutritionTargetUnavailable(f'{day}: 부족한 열량을 채울 간식 시간이 없습니다. 식사 사이에 여유 시간을 확보해 주세요.')
            event = dict(id=str(uuid.uuid4()),kind='SNACK',title=snack['title'],
                         details='목표 열량의 부족분을 보충하기 위해 자동 추가한 간식입니다. '+snack['note'],
                         start=stamp(day,slot),end=stamp(day,slot+10),intensity='',completed=False,
                         foodEvidence=deepcopy(snack['foodEvidence']))
            result['events'].append(event)
            events.append(event)
            occupied.append((slot,slot+10))
        food = [e for e in events if e['kind'] in ('MEAL','SNACK')]
        calories = [number(e.get('foodEvidence',{}).get('nutrition',{}).get('INFO_ENG')) for e in food]
        if any(v is None or v<=0 for v in calories) or abs(sum(calories)-target['calories'])>target['calories']*.05:
            raise NutritionTargetUnavailable(f'{day}: 배치된 식사·간식 합계가 목표 열량 ±5%를 충족하지 못했습니다. 식단을 다시 생성해 주세요.')
        if not balanced_meals([float(e['foodEvidence']['nutrition']['INFO_ENG']) for e in meals], target['calories']):
            raise NutritionTargetUnavailable(f'{day}: 한 끼에 열량이 몰려 식단을 반환하지 않았습니다. 식사와 간식 구성을 다시 조정해 주세요.')
        totals=[sum(float(e['foodEvidence']['nutrition'][k]) for e in food) for k in ('INFO_CAR','INFO_PRO','INFO_FAT')]
        if not balanced_macros(*totals, target['protein']):
            raise NutritionTargetUnavailable(f'{day}: 탄단지 비율 또는 단백질 목표를 충족하지 못해 식단을 반환하지 않았습니다.')
        count = sum(e['kind']=='SNACK' for e in food)
        result['notices'].append(f'{day}: 식사·간식 계획 {sum(calories):.0f} / 목표 {target["calories"]:.0f} kcal · 목표 ±5% 충족 · 자동 간식 {count}개 (섭취 완료 아님).')
    validate_food_policy(result['events'])
    result['events'].sort(key=lambda e:e['start'])
    return result
