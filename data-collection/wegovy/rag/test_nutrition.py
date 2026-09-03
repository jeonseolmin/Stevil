import unittest
from nutrition import validate_goal, recipe_nutrition, match_week


def row(i,kcal,protein):
    return dict(RCP_SEQ=str(i),INFO_WGT='400',INFO_ENG=str(kcal),INFO_CAR=str((kcal-protein*4-90)/4),INFO_PRO=str(protein),INFO_FAT='10')


class NutritionTest(unittest.TestCase):
    def test_goal_and_nonfinite_rejected(self):
        goal=dict(weightKg=70,proteinPerKg=1,calories=1800,confirmed=True)
        self.assertEqual(validate_goal(goal)['protein'],70)
        for change in [dict(weightKg=float('nan')),dict(confirmed=False),dict(proteinPerKg=3,calories=1000)]:
            with self.assertRaises(ValueError): validate_goal(goal|change)
    def test_missing_basis_and_inconsistent_nutrients_rejected(self):
        self.assertIsNone(recipe_nutrition(row(1,500,20)|{'INFO_WGT':''}))
        self.assertIsNone(recipe_nutrition(row(1,500,20)|{'INFO_ENG':'100'}))
    def test_three_meals_match_target_and_use_source_ids(self):
        rows=[row(1,600,20),row(2,600,25),row(3,600,25),row(4,200,5)]
        days,notices=match_week(rows,dict(weightKg=70,proteinPerKg=1,calories=1800,confirmed=True))
        self.assertEqual({r['RCP_SEQ'] for r in days[0]},{'1','2','3'})
        self.assertEqual(len(days),7)
        self.assertEqual(len(notices),7)


if __name__=='__main__': unittest.main()
