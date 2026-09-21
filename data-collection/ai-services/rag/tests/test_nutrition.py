import unittest
from unittest.mock import patch

from planner.nutrition import matching
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


def snack(i, kcal, protein, category='misc'):
    return dict(
        id=f'snack:{i}',
        title=f'snack{i}',
        category=category,
        note='',
        foodEvidence=dict(nutrition=dict(
            INFO_ENG=str(kcal),
            INFO_PRO=str(protein),
            INFO_CAR=str(max(0, (kcal - protein * 4) / 4 / 2)),
            INFO_FAT=str(max(0, (kcal - protein * 4) / 9 / 2)),
        )),
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

    def test_high_protein_ratio_is_a_soft_warning_not_a_hard_reject(self):
        # protein*4 > calories*.35, but this is a Stevil soft management
        # guideline now; validate_goal() must not raise for it.
        goal = dict(weightKg=70, proteinPerKg=3, calories=1400, confirmed=True)
        result = validate_goal(goal)
        self.assertEqual(result['protein'], 210.0)
        self.assertEqual(result['calories'], 1400.0)

    def test_calorie_floor_is_1200_with_no_upper_bound(self):
        low_ratio_goal = dict(weightKg=70, proteinPerKg=1, confirmed=True)

        with self.assertRaises(ValueError):
            validate_goal(low_ratio_goal | {'calories': 1199})

        self.assertEqual(validate_goal(low_ratio_goal | {'calories': 1200})['calories'], 1200.0)
        self.assertEqual(validate_goal(low_ratio_goal | {'calories': 5001})['calories'], 5001.0)

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

    def test_phase10_cache_and_pruning_preserve_valid_selection(self):
        # Enough variety to make the (food,snack_set) choice cache and the
        # lossless interval pruning actually do nontrivial work, while
        # staying well under MAX_MATCH_FOOD_CANDIDATES so no cap applies.
        rows = [
            row(i, kcal, protein)
            for i, (kcal, protein) in enumerate([
                (500, 20), (550, 22), (600, 25), (650, 28), (700, 20),
                (520, 30), (580, 18), (620, 24),
            ])
        ]
        goal = dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True)
        days, notices = match_week(rows, goal)

        self.assertEqual(len(days), 7)
        required_min, allowed_max = matching._protein_bounds(70)

        for day in days:
            self.assertEqual(len(day), 3)
            total_kcal = sum(float(meal['INFO_ENG']) for meal in day)
            total_protein = sum(float(meal['INFO_PRO']) for meal in day)
            # Same +-5% calorie and balanced_macros protein bounds the
            # unpruned loop enforces -- pruning must not have let an
            # out-of-bound selection through, nor dropped the real best.
            self.assertLessEqual(abs(total_kcal - 1800), 1800 * 0.05 + 1e-6)
            self.assertGreaterEqual(total_protein, required_min - 1e-6)
            self.assertLessEqual(total_protein, allowed_max + 1e-6)

    def test_phase10_food_and_snack_caps_apply_and_plan_stays_valid(self):
        rows = [
            row(i, 500 + (i % 7) * 20, 18 + (i % 5) * 2)
            for i in range(25)
        ]
        self.assertGreater(len(rows), matching.MAX_MATCH_FOOD_CANDIDATES)

        snacks = [
            snack(i, 150, 8, category=('a', 'b', 'c')[i % 3])
            for i in range(15)
        ]
        self.assertGreater(len(snacks), matching.MAX_MATCH_SNACK_CANDIDATES)

        goal = dict(weightKg=70, proteinPerKg=1, calories=1800, confirmed=True)
        days, notices = match_week(rows, goal, snacks)

        self.assertEqual(len(days), 7)
        self.assertEqual(len(notices), 7)
        for day in days:
            self.assertEqual(len(day), 3)

    def test_phase10_snack_category_quota_spreads_across_categories(self):
        snacks = (
            [snack(f'a{i}', 100, 5, category='a') for i in range(6)]
            + [snack(f'b{i}', 100, 5, category='b') for i in range(6)]
            + [snack(f'c{i}', 100, 5, category='c') for i in range(6)]
        )
        capped = matching._cap_snacks_by_category_quota(snacks, 12)

        self.assertEqual(len(capped), 12)
        counts = {}
        for item in capped:
            counts[item['category']] = counts.get(item['category'], 0) + 1
        # 18 items / 3 categories, limit=12 -> no single category should
        # be starved to zero just because of list order.
        self.assertEqual(set(counts), {'a', 'b', 'c'})
        self.assertTrue(all(count == 4 for count in counts.values()))

        # Deterministic: same input -> same output.
        self.assertEqual(capped, matching._cap_snacks_by_category_quota(snacks, 12))


if __name__ == '__main__':
    unittest.main()
