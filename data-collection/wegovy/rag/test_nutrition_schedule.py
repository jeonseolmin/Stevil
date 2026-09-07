import unittest
from unittest.mock import patch
from copy import deepcopy

from nutrition import match_week, NutritionTargetUnavailable
from nutrition_schedule import complete_nutrition, load_snacks
from planner import schedule
from test_planner import preferences
from test_nutrition import row


def composed(i, kcal):
    r = row(i, kcal, kcal*.10/4)
    nutrients = {k:r[k] for k in ('INFO_ENG','INFO_PRO','INFO_CAR','INFO_FAT')}
    components = [dict(name=role,role=role,foodId=f'{i}-{role}',basisWeight='400',
                       servingWeight=str(400/3),nutrition=nutrients,
                       amountNutrition={k:str(float(v)/3) for k,v in nutrients.items()},fingerprint='a'*64)
                  for role in ('staple','protein','vegetable')]
    r['_evidence'] = dict(recipeId=str(i),nutrition=nutrients,servingWeight='400',components=components)
    return r


def snack(kcal=200):
    r=row('snack',kcal,kcal*.10/4)
    return dict(id='snack',title='간식',note='원문 기준량',foodEvidence={
        'servingWeight':'400','nutrition':{k:r[k] for k in ('INFO_ENG','INFO_PRO','INFO_CAR','INFO_FAT')}})


class NutritionScheduleTest(unittest.TestCase):
    def setUp(self):
        # Isolate nutrient arithmetic/scheduling; test_food_policy exercises weekly rotation.
        rotation=patch('nutrition.choose_diverse_week',side_effect=lambda options:[min(options,key=lambda item:item[0])]*7)
        rotation.start(); self.addCleanup(rotation.stop)
        validation=patch('nutrition_schedule.validate_food_policy')
        validation.start(); self.addCleanup(validation.stop)
        self.p=preferences()
        self.p['nutritionGoal']=dict(weightKg=70,proteinPerKg=1,calories=3000,confirmed=True)

    def plan(self, kcal, snacks=()):
        days,_=match_week([composed(i,kcal) for i in range(3)],self.p['nutritionGoal'],snacks)
        suggestions=[dict(meals=[dict(title='식사',details='제안량',foodEvidence=r['_evidence']) for r in day],
                          exercise=dict(title='운동',details=''),plannedSnacks=day[0]['_plannedSnacks']) for day in days]
        return suggestions, schedule(self.p,suggestions)

    def test_2100_is_adjusted_with_practical_amounts_without_snacks(self):
        self.p['nutritionGoal']['calories']=2500
        suggestions,result=self.plan(700)
        result=complete_nutrition(self.p,result,suggestions)
        monday=[e for e in result['events'] if e['start'][:10]==self.p['weekStart'] and e['kind']=='MEAL']
        total=sum(float(e['foodEvidence']['nutrition']['INFO_ENG']) for e in monday)
        self.assertTrue(2375 <= total <= 2625)
        self.assertNotEqual(total,2500)
        self.assertFalse(any(e['kind']=='SNACK' for e in result['events']))
        for e in monday:
            for c in e['foodEvidence']['components']:
                self.assertEqual(float(c['servingWeight']) % 5, 0)
                self.assertAlmostEqual(float(c['amountNutrition']['INFO_ENG']),float(c['nutrition']['INFO_ENG'])*float(c['servingWeight'])/400,places=3)

    def test_snack_fills_gap_without_marking_consumed(self):
        suggestions,result=self.plan(600,[snack()])
        result=complete_nutrition(self.p,result,suggestions)
        snacks=[e for e in result['events'] if e['kind']=='SNACK']
        self.assertEqual(len(snacks),7)
        self.assertTrue(all(e['completed'] is False for e in snacks))
        for a,b in zip(result['events'],result['events'][1:]):
            self.assertLessEqual(a['end'],b['start'])

    def test_impossible_target_and_missing_meal_fail(self):
        with self.assertRaises(NutritionTargetUnavailable):
            match_week([row(i,700,25) for i in range(3)],self.p['nutritionGoal'])
        suggestions,result=self.plan(700,[snack(),dict(snack(),id="second")])
        result['events']=[e for e in result['events'] if e!=result['events'][0]]
        with self.assertRaises(NutritionTargetUnavailable): complete_nutrition(self.p,result,suggestions)

    def test_work_allows_automatic_snack(self):
        self.p['busySlots']=[dict(day=0,start='09:00',end='17:00',allowMeals=True,allowSnacks=True)]
        suggestions,result=self.plan(600,[snack()])
        events=complete_nutrition(self.p,result,suggestions)['events']
        self.assertTrue(any(e['kind']=='SNACK' and '2026-09-07T09:00'<=e['start']<'2026-09-07T17:00' for e in events))

    def test_no_free_snack_slot_fails(self):
        suggestions,result=self.plan(600,[snack()])
        self.p['busySlots']=[dict(day=0,start='08:30',end='18:30')]
        with self.assertRaises(NutritionTargetUnavailable): complete_nutrition(self.p,result,suggestions)

    def test_original_rows_unchanged_and_catalog_shared(self):
        rows=[composed(i,700) for i in range(3)];before=deepcopy(rows)
        match_week(rows,self.p['nutritionGoal'],[snack(),dict(snack(),id='second')])
        self.assertEqual(rows,before)
        from pathlib import Path
        import json
        backend=Path(__file__).resolve().parents[3]/'stevil-backend/src/main/resources/planner/snacks.json'
        self.assertEqual(load_snacks(),json.loads(backend.read_text(encoding='utf-8')))

    def test_target_boundaries_and_two_snacks(self):
        for kcal in (570,630):
            days,_=match_week([row(i,kcal,25) for i in range(3)],self.p['nutritionGoal'] | {'calories':1800})
            self.assertEqual(len(days),7)
        suggestions,result=self.plan(600,[snack(100),dict(snack(110),id='second')])
        result=complete_nutrition(self.p,result,suggestions)
        self.assertEqual(sum(e['kind']=='SNACK' for e in result['events']),14)

    def test_2500_goal_does_not_force_exact_calories(self):
        self.p['nutritionGoal']['calories']=2500
        suggestions,result=self.plan(620)
        result=complete_nutrition(self.p,result,suggestions)
        total=sum(float(e['foodEvidence']['nutrition']['INFO_ENG']) for e in result['events']
                  if e['kind']=='MEAL' and e['start'][:10]==self.p['weekStart'])
        self.assertTrue(2375 <= total <= 2625)
        self.assertNotEqual(total,2500)

    def test_1200_meal_cannot_pass_with_balanced_daily_total(self):
        goal=self.p['nutritionGoal'] | {'calories':2500}
        # Previously 650 + 650 + 1200 passed because the daily sum was exact.
        with self.assertRaises(NutritionTargetUnavailable):
            match_week([row(1,650,25),row(2,650,25),row(3,1200,25)],goal)
        days,_=match_week([composed(1,650),composed(2,650),composed(3,1200)],goal,
                          [snack(),dict(snack(),id='second')])
        for day in days:
            amounts=[float(r['INFO_ENG']) for r in day]
            self.assertLessEqual(max(amounts),875)
            self.assertLessEqual(max(amounts),min(amounts)*1.5)

    def test_snacks_preferred_to_inflating_all_meals_and_spread_out(self):
        suggestions,result=self.plan(800,[snack(),dict(snack(),id='second')])
        result=complete_nutrition(self.p,result,suggestions)
        monday=[e for e in result['events'] if e['start'][:10]==self.p['weekStart']]
        snacks=[e for e in monday if e['kind']=='SNACK']
        meals=[e for e in monday if e['kind']=='MEAL']
        self.assertEqual(len(snacks),2)
        self.assertLess(snacks[0]['end'],meals[1]['start'])
        self.assertGreater(snacks[1]['start'],meals[1]['end'])
        self.assertTrue(all(float(e['foodEvidence']['nutrition']['INFO_ENG'])<=900 for e in meals))


if __name__=='__main__': unittest.main()
