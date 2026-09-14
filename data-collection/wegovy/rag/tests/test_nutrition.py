import unittest
from unittest.mock import patch

from planner.nutrition.matching import validate_goal, recipe_nutrition, match_week


def row(i, kcal, protein):
    return dict(
        RCP_SEQ=str(i),
        INFO_WGT='400',
        INFO_ENG=str(kcal),
        INFO_CAR=str((kcal * .75 - protein * 4) / 4),
        INFO_PRO=str(protein),
        INFO_FAT=str(kcal * .25 / 9),
    )


class NutritionTest(unittest.TestCase):
    def setUp(self):
        rotation = patch(
            'planner.nutrition.matching.choose_diverse_week',
            side_effect=lambda options: [min(options, key=lambda item: item[0])] * 7,
        )
        rotation.start()
        self.addCleanup(rotation.stop)

    def test_macros_and_confirmed_protein_target_are_required(self):
        from planner.nutrition.matching import NutritionTargetUnavailable

        goal = dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True)
        fatty = [row(i, 600, 25) | {'INFO_FAT': '50', 'INFO_CAR': '12.5'} for i in range(3)]
        with self.assertRaises(NutritionTargetUnavailable):
            match_week(fatty, goal)

        balanced = [row(i + 3, 600, 25) for i in range(3)]
        days, _ = match_week(fatty + balanced, goal)
        self.assertTrue(all({r['RCP_SEQ'] for r in day} == {'3', '4', '5'} for day in days))

        with self.assertRaises(NutritionTargetUnavailable):
            match_week(balanced, goal | {'proteinPerKg': 1.8})

    def test_goal_and_nonfinite_rejected(self):
        goal = dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True)
        self.assertEqual(validate_goal(goal)['protein'], 70)

        for change in [
            dict(weightKg=float('nan')),
            dict(confirmed=False),
            dict(proteinPerKg=3, calories=1000),
        ]:
            with self.assertRaises(ValueError):
                validate_goal(goal | change)

    def test_missing_basis_and_inconsistent_nutrients_rejected(self):
        self.assertIsNone(recipe_nutrition(row(1, 500, 20) | {'INFO_WGT': ''}))
        self.assertIsNone(recipe_nutrition(row(1, 500, 20) | {'INFO_ENG': '100'}))

    def test_three_meals_match_target_and_use_source_ids(self):
        rows = [row(1, 600, 20), row(2, 600, 25), row(3, 600, 25), row(4, 200, 5)]
        days, notices = match_week(
            rows,
            dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True),
        )
        self.assertEqual({r['RCP_SEQ'] for r in days[0]}, {'1', '2', '3'})
        self.assertEqual(len(days), 7)
        self.assertEqual(len(notices), 7)


if __name__ == '__main__':
    unittest.main()
