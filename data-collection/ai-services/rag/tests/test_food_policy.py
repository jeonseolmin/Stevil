import unittest
from collections import Counter
from unittest.mock import patch

from planner.food.policy import (
    processed_meat, main_food_keys, validate_food_policy, FoodPolicyUnavailable,
)
from planner.nutrition.matching import match_week
from planner.food.nutrient_catalog import NutrientCatalog
from tests.test_nutrition import row


class FoodPolicyTest(unittest.TestCase):
    def test_processed_meat_in_titles_ingredients_and_components(self):
        for name in ['런천미트구이', '소세지볶음', '햄구이', '베이컨', 'Spam rice']:
            self.assertTrue(processed_meat({'RCP_NM': name}))
            self.assertTrue(processed_meat({'RCP_NM': '채소밥', 'RCP_PARTS_DTLS': name + ' 30g'}))
        self.assertTrue(processed_meat({'foodEvidence': {'components': [{'name': '런천미트구이'}]}}))
        self.assertFalse(processed_meat({'title': '햄프프로틴쉐이크'}))
        self.assertFalse(processed_meat({'title': '수제 소고기 햄버거'}))

    def test_rice_and_portion_changes_do_not_hide_same_protein(self):
        a = {'RCP_NM': '밥 A', '_evidence': {'components': [{'role': 'protein', 'name': '쇠고기구이_양념'}]}}
        b = {'RCP_NM': '밥 B', '_evidence': {'components': [{'role': 'protein', 'name': '소고기 구이_채소'}]}}
        self.assertEqual(main_food_keys(a), main_food_keys(b))

        events = [
            {
                'kind': 'MEAL',
                'title': '밥 ' + str(i),
                'start': f'2026-09-{7 + i:02d}T12:00',
                'foodEvidence': a['_evidence'],
            }
            for i in range(3)
        ]
        with self.assertRaises(FoodPolicyUnavailable):
            validate_food_policy(events)

    def test_week_rotates_actual_ingredients_and_preserves_nutrition(self):
        names = [
            '닭가슴살구이', '돼지고기찜', '소고기구이', '오리구이', '두부부침', '계란찜',
            '고등어구이', '연어구이', '명태조림', '새우찜', '오징어볶음', '참치구이',
        ]
        rows = [row(i, 600, 25) | {'RCP_NM': name} for i, name in enumerate(names)]
        days, _ = match_week(rows, dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True))

        dishes = Counter()
        groups = Counter()
        events = []
        for day, meals in enumerate(days):
            daily = Counter()
            for meal in meals:
                d, g = main_food_keys(meal)
                dishes.update(d)
                groups.update(g)
                daily.update(g)
                events.append({'kind': 'MEAL', 'title': meal['RCP_NM'], 'start': f'2026-09-{day + 7:02d}T12:00'})
            self.assertEqual(sum(float(m['INFO_ENG']) for m in meals), 1800)
            self.assertLessEqual(max(daily.values()), 1)

        self.assertLessEqual(max(dishes.values()), 2)
        self.assertLessEqual(max(groups.values()), 5)
        validate_food_policy(events)

        with self.assertRaises(FoodPolicyUnavailable):
            match_week(rows[:3], dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True))

    def test_existing_nutrient_index_is_reused_and_processed_food_filtered(self):
        from tests.test_nutrition_catalog import ROWS, fixture
        from planner.food.nutrient_catalog import normalize

        catalog = NutrientCatalog.__new__(NutrientCatalog)
        catalog.metadata = {'retrievedAt': '2026-09-03'}
        source = ROWS + [
            fixture(
                "ham",
                "런천미트구이",
                "구이류",
                200,
                0,
                20,
                13,
            )
        ]

        catalog.rows = {
            row["FOOD_CD"]: normalized
            for row in source
            for normalized, _ in [normalize(row)]
            if normalized is not None
        }

        self.assertNotIn("ham", catalog.rows)

        with patch(
                "planner.food.nutrient_catalog.VectorIndex"
        ) as index:
            catalog.index = index.return_value
            catalog.index.ready = True
            catalog.index.rank.return_value = [
                ("rice", 0.9),
                ("fish", 0.8),
                ("veg", 0.7),
            ]

            meals = catalog.retrieve_meals({})

            self.assertTrue(meals)
            self.assertFalse(
                any(processed_meat(meal) for meal in meals)
            )
            catalog.index.build.assert_not_called()


if __name__ == '__main__':
    unittest.main()
