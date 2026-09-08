import unittest
from snack_catalog import candidate


def row(name):
    return dict(FOOD_CD='sample',FOOD_NM_KR=name,SERVING_SIZE='100g',
                AMT_NUM1='150',AMT_NUM3='13',AMT_NUM4='10',AMT_NUM6='2',AMT_NUM13='1,130.000')


class SnackTest(unittest.TestCase):
    def test_whole_boiled_egg_is_distinguished_from_yolk_and_raw_egg(self):
        c=candidate(row('달걀_삶은것'),'2026-09-03')
        self.assertEqual(c['category'],'egg')
        self.assertEqual(c['foodEvidence']['nutrition']['INFO_PRO'],'6.5000')
        self.assertEqual(c['foodEvidence']['nutrition']['INFO_NA'],'565.0000')
        for name in ['달걀_난황_삶은것','달걀_난백_삶은것','달걀_생것','닭가슴살_생것']:
            self.assertIsNone(candidate(row(name),'2026-09-03'))

    def test_missing_or_volume_basis_is_not_assumed_to_be_grams(self):
        self.assertIsNone(candidate(row('달걀_삶은것')|{'SERVING_SIZE':'100mL'},'2026-09-03'))
        self.assertIsNone(candidate(row('달걀_삶은것')|{'AMT_NUM3':''},'2026-09-03'))


if __name__=='__main__': unittest.main()
