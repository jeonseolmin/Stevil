import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from planner.food.catalog import FoodCatalog, FoodUnavailable, SOURCE
from planner.service import ground_suggestions


class FoodTest(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.nutrient_root = Path(directory.name)
        patcher = patch('planner.food.catalog.NUTRIENT_ROOT', self.nutrient_root)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_new_food_compositions_are_used_without_nutrition_goal(self):
        self.nutrient_root.joinpath('foods.sqlite3').touch()
        catalog = self.catalog()
        meals = [dict(RCP_SEQ='meal:' + str(i), RCP_NM='조합 ' + str(i)) for i in range(24)]
        with patch('planner.food.catalog.NutrientCatalog') as nutrient:
            nutrient.return_value.retrieve_meals.return_value = meals
            selected = catalog.retrieve({})
        self.assertEqual(len(selected), 40)
        self.assertEqual(selected[16:], meals)

    def catalog(self, sample=False):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / 'catalog.json'
        rows = [
            dict(
                RCP_SEQ=str(i),
                RCP_NM='공식 메뉴 ' + str(i),
                RCP_PAT2='밥',
                RCP_PARTS_DTLS='쌀 100g',
                INFO_ENG='123',
            )
            for i in range(25)
        ]
        path.write_text(
            json.dumps(dict(sample=sample, rows=rows, retrievedAt='2026-09-02T00:00:00Z')),
            encoding='utf-8',
        )
        with patch('planner.food.catalog.VectorIndex') as index:
            index.return_value.ready = True
            index.return_value.rank.return_value = [(str(i), .8) for i in range(25)]
            return FoodCatalog(path)

    def test_processed_meat_in_recipe_ingredients_is_excluded(self):
        catalog = self.catalog()
        catalog.rows['0']['RCP_PARTS_DTLS'] = '쌀 100g, 런천미트 30g'
        selected = catalog.retrieve({})
        self.assertFalse(any(r['RCP_SEQ'] == '0' for r in selected))

    def test_sample_cannot_become_real_meal_plan(self):
        with self.assertRaises(FoodUnavailable):
            self.catalog(True).retrieve({})

    def test_allergy_is_not_silently_ignored(self):
        catalog = self.catalog()
        for allergy in ['우유', '알 수 없는 식품', '땅콩 알레르기']:
            with self.assertRaises(FoodUnavailable):
                catalog.retrieve({'allergies': allergy})
        catalog.index.rank.assert_not_called()

    def test_sides_cannot_be_used_as_complete_meals(self):
        catalog = self.catalog()
        for row in catalog.rows.values():
            row['RCP_PAT2'] = '반찬'
        with self.assertRaises(FoodUnavailable):
            catalog.retrieve({})

    def result(self, recipe_id):
        return {
            'days': [
                {
                    'meals': [
                        {'recipeId': recipe_id, 'title': 'invented', 'calories': 1}
                        for _ in range(3)
                    ],
                    'exercise': {
                        'exerciseId': 'walking',
                        'details': '천천히',
                        'evidenceIds': ['ev-1'],
                    },
                }
                for _ in range(7)
            ]
        }

    def exercise_context(self):
        allowed_exercises = {
            'walking': {
                'id': 'walking',
                'name': '걷기',
                'category': 'aerobic',
                'target': '전신',
                'difficulty': 'beginner',
                'equipment': '없음',
                'impact': 'low',
            }
        }
        retrieval = {
            'items': [
                {
                    'evidenceId': 'ev-1',
                    'title': 'Walking',
                    'section': 'Adults',
                    'text': 'General physical activity evidence.',
                    'sourceId': 'test',
                    'url': '',
                    'population': 'adults',
                    'recommendationGrade': '',
                    'recommendationStrength': '',
                    'recommendation': False,
                    'glp1Specific': False,
                    'reviewStatus': 'test',
                    'retrievalScore': 1.0,
                }
            ]
        }
        return allowed_exercises, retrieval

    def ground(self, result, allowed, catalog):
        allowed_exercises, retrieval = self.exercise_context()
        return ground_suggestions(result, allowed, catalog, allowed_exercises, retrieval)

    def test_unknown_id_rejected_and_food_facts_are_source_values(self):
        catalog = self.catalog()
        allowed = {'0': catalog.rows['0']}

        with self.assertRaises(RuntimeError):
            self.ground(self.result('999'), allowed, catalog)

        meal = self.ground(self.result('0'), allowed, catalog)[0]['meals'][0]
        self.assertEqual(meal['title'], '공식 메뉴 0')
        self.assertEqual(meal['foodEvidence']['nutrition']['INFO_ENG'], '123')
        self.assertEqual(meal['foodEvidence']['servingWeight'], '')
        self.assertEqual(meal['foodEvidence']['sourceUrl'], SOURCE)


if __name__ == '__main__':
    unittest.main()
