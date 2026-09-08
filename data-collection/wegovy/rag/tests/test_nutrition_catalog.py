import json
from contextlib import closing
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from nutrition_catalog import normalize, grams, parse_page, initialize, ingest, NutrientCatalog, diverse_foods, nutrient_text
from nutrition import match_week


def fixture(code, name, category, kcal, carbs, protein, fat):
    return dict(FOOD_CD=code, FOOD_NM_KR=name, FOOD_CAT1_NM=category, DB_GRP_NM='음식',
                SERVING_SIZE='100g', AMT_NUM1=str(kcal), AMT_NUM6=str(carbs),
                AMT_NUM3=str(protein), AMT_NUM4=str(fat), AMT_NUM13='')


ROWS = [fixture('rice', '현미밥', '밥류', 150, 32, 3, 1),
        fixture('fish', '생선구이', '구이류', 180, 0, 25, 9),
        fixture('veg', '시금치나물', '나물·숙채류', 40, 5, 3, 1)]


class NutrientCatalogTest(unittest.TestCase):
    def test_grouped_source_numbers_are_normalized_before_portion_calculation(self):
        self.assertEqual(nutrient_text('1,130.000'), '1130.000')
        for value in ['1,13.0', '1,', 'NaN', '<0.1', None]:
            self.assertEqual(nutrient_text(value), '')
        food,reason = normalize(ROWS[1] | {'AMT_NUM13':'1,130.000'})
        self.assertIsNone(reason)
        catalog=NutrientCatalog.__new__(NutrientCatalog)
        catalog.metadata={'retrievedAt':'2026-09-03'}
        component=catalog.component(food,75)
        self.assertEqual(component['nutrition']['INFO_NA'],'1130.000')
        self.assertEqual(component['amountNutrition']['INFO_NA'],'847.5000')

    def test_shortlist_deduplicates_variants_and_includes_cooking_categories(self):
        rows = [{'id':str(i),'name':name,'category':category} for i,(name,category) in enumerate([
            ('콩밥_검정콩','밥류'),('콩밥_완두콩','밥류'),('잡곡밥','밥류'),
            ('고등어구이','구이류'),('삼치구이','구이류'),('닭찜','찜류')])]
        selected = diverse_foods(rows, 3)
        self.assertEqual([r['name'] for r in selected], ['콩밥_검정콩','고등어구이','닭찜'])
        self.assertEqual(len(diverse_foods(rows)), 5)

    def test_units_and_missing_values_not_imputed(self):
        self.assertEqual(grams(' 100 g '), 100)
        for value in ['100ml', '100', '', '0g', 'NaNg']:
            self.assertIsNone(grams(value))
        for change in [{'SERVING_SIZE':'100ml'}, {'AMT_NUM3':''}, {'AMT_NUM4':'NaN'}, {'DB_GRP_NM':'원재료성 식품'}]:
            self.assertIsNone(normalize(ROWS[0] | change)[0])
        self.assertEqual([normalize(r)[0]['role'] for r in ROWS], ['staple','protein','vegetable'])
        self.assertIsNone(normalize(ROWS[0] | {'FOOD_NM_KR':'볶음밥'})[0])
        self.assertIsNone(normalize(ROWS[2] | {'FOOD_NM_KR':'오징어무침_채소','FOOD_CAT1_NM':'생채·무침류'})[0])

    def test_response_shapes_and_auth_failure(self):
        header = {'resultCode':'00'}
        for items in [ROWS, {'item': ROWS}]:
            self.assertEqual(parse_page({'header':header,'body':{'items':items,'totalCount':'3'}}), (ROWS,3))
        self.assertEqual(parse_page({'response':{'header':header,'body':{'items':{'item':ROWS[0]},'totalCount':1}}}), ([ROWS[0]],1))
        with self.assertRaises(RuntimeError): parse_page({'header':{'resultCode':'30'}})

    def test_sqlite_roundtrip_portions_sources_and_missing_sodium(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with closing(sqlite3.connect(root/'foods.sqlite3')) as db:
                initialize(db); ingest(db, ROWS)
                ingest(db, [ROWS[0]])  # Same source code updates, not duplicates.
                db.execute("INSERT INTO metadata VALUES ('retrievedAt','2026-09-03T00:00:00Z')")
                self.assertEqual(db.execute('SELECT count(*) FROM foods').fetchone()[0], 3)
                db.commit()
            with patch('nutrition_catalog.VectorIndex') as index:
                index.return_value.ready = True
                index.return_value.rank.return_value = [(r['FOOD_CD'], .8) for r in ROWS]
                catalog = NutrientCatalog(root)
                meal = catalog.meal([catalog.rows[r['FOOD_CD']] for r in ROWS], [200,100,80])
                evidence = meal['_evidence']
                self.assertAlmostEqual(float(evidence['nutrition']['INFO_ENG']),512)
                self.assertAlmostEqual(float(evidence['nutrition']['INFO_PRO']),33.4)
                self.assertEqual(evidence['nutrition']['INFO_NA'],'')
                self.assertEqual(evidence['components'][0]['nutrition']['INFO_ENG'],'150')
                self.assertEqual(evidence['components'][0]['amountNutrition']['INFO_ENG'],'300.0000')
                self.assertEqual(evidence['components'][0]['basisWeight'],'100.0')
                self.assertEqual(evidence['components'][0]['servingWeight'],'200')
                self.assertEqual(evidence['components'][0]['foodId'],'rice')
                meals = catalog.retrieve_meals({'nutritionGoal':dict(weightKg=70,proteinPerKg=1,calories=1800,confirmed=True)})
                self.assertEqual(len(meals),1)
                self.assertEqual(len(meals[0]['_evidence']['components']),3)
                ordinary = catalog.retrieve_meals({})
                self.assertEqual(len(ordinary),1)
                self.assertEqual([c['servingWeight'] for c in ordinary[0]['_evidence']['components']], ['200','100','80'])


if __name__ == '__main__': unittest.main()
