"""Source-backed recipe retrieval. No generated recipes or inferred nutrition values."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
from urllib.request import urlopen
from hybrid import VectorIndex
from nutrition import recipe_nutrition
from nutrition_catalog import NutrientCatalog, ROOT as NUTRIENT_ROOT

ROOT = Path(__file__).parent / 'cache' / 'food'
SOURCE = 'https://www.foodsafetykorea.go.kr/api/openApiInfo.do?menu_no=661&svc_no=COOKRCP01'


class FoodUnavailable(RuntimeError):
    pass


def collect(sample=False):
    key = 'sample' if sample else os.environ.get('FOOD_SAFETY_API_KEY', '')
    if not re.fullmatch(r'[A-Za-z0-9]+', key):
        raise FoodUnavailable('FOOD_SAFETY_API_KEY를 설정한 뒤 식품 자료를 수집해 주세요.')
    rows = []
    for start in range(1, 10001, 100):
        end = 5 if sample else start + 99
        # Credentials are used only with the official TLS endpoint; never logged.
        with urlopen(f'https://openapi.foodsafetykorea.go.kr/api/{key}/COOKRCP01/json/{start}/{end}', timeout=30) as response:
            result = json.load(response)['COOKRCP01']
        if result.get('RESULT', {}).get('CODE') != 'INFO-000':
            raise FoodUnavailable('공식 식품 API 응답을 확인해 주세요. 키와 서비스 권한이 필요합니다.')
        batch = result.get('row', [])
        rows.extend(batch)
        if sample or len(rows) >= int(result['total_count']): break
        if not batch: raise FoodUnavailable('식품 자료 수집이 중간에 끊겼습니다.')
    else:
        raise FoodUnavailable('수집 상한을 초과했습니다. 페이지 범위를 확인해 주세요.')
    data = {'source': SOURCE, 'retrievedAt': datetime.now(timezone.utc).isoformat(), 'sample': sample,
            'rows': list({str(r['RCP_SEQ']): r for r in rows}.values())}
    ROOT.mkdir(parents=True, exist_ok=True)
    path = ROOT / ('sample.json' if sample else 'catalog.json')
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
    tmp.replace(path)
    return path


def document(row):
    text = '\n'.join(str(row.get(k, '')) for k in ('RCP_NM', 'RCP_PAT2', 'RCP_WAY2', 'RCP_PARTS_DTLS', 'HASH_TAG'))
    return {'id': str(row['RCP_SEQ']), 'section': row['RCP_NM'], 'text': text}


class FoodCatalog:
    def __init__(self, path=None):
        path = path or ROOT / 'catalog.json'
        if not path.exists():
            raise FoodUnavailable('식품 자료가 아직 준비되지 않았어요. 공식 레시피 수집과 임베딩을 먼저 완료해 주세요.')
        self.data = json.loads(path.read_text(encoding='utf-8'))
        self.rows = {str(r['RCP_SEQ']): r for r in self.data['rows']}
        self.index = VectorIndex([document(r) for r in self.rows.values()], ROOT / 'embeddings.sqlite3')
        self.notices = []

    def retrieve(self, preferences):
        if self.data.get('sample') or not self.index.ready:
            raise FoodUnavailable('정식 식품 자료의 임베딩이 준비되지 않았어요. 샘플 자료로 주간 식단을 만들지는 않습니다.')
        # This source has no authoritative allergen/cross-contact metadata. Fail closed
        # instead of presenting substring matches as an allergy-safe meal plan.
        if preferences.get('allergies', '').strip() not in ('', '없음', '없어요', '해당 없음'):
            raise FoodUnavailable('현재 식품 DB는 알레르기 성분을 검증할 수 없어 자동 식단을 만들 수 없어요. 알레르기 정보를 지우지 말고 전문가에게 식단을 확인해 주세요.')
        query = '일주일 식사 밥 한 끼 메뉴 ' + preferences.get('preferences', '')
        try:
            ranked = self.index.rank(query, limit=len(self.rows))
        except (OSError, ValueError, KeyError):
            raise FoodUnavailable('식품 검색 연결에 실패했어요. 잠시 후 다시 시도해 주세요.') from None
        # Side dishes/desserts alone are not complete meal candidates.
        selected = [self.rows[key] for key, _ in ranked if self.rows[key].get('RCP_PAT2') in ('밥', '일품') and (not preferences.get('nutritionGoal') or recipe_nutrition(self.rows[key]) is not None)][:40]
        if (NUTRIENT_ROOT / 'foods.sqlite3').exists():
            try:
                meals = NutrientCatalog().retrieve_meals(preferences)
            except (OSError, ValueError, KeyError, sqlite3.Error):
                raise FoodUnavailable('추가 영양정보 검색이 준비되지 않았어요. 수집과 임베딩 상태를 확인해 주세요.') from None
            if meals:
                selected = selected[:max(16, 21-len(meals))] + meals
            else:
                self.notices.append('조건에 맞는 밥·반찬·채소 조합이 부족해 기존 레시피에서 선택했어요.')
        else:
            self.notices.append('추가 영양 DB 수집 전이므로 현재 등록된 레시피로 추천했어요.')
        minimum = 3 if preferences.get('nutritionGoal') else 21
        if len(selected) < minimum:
            raise FoodUnavailable(f'조건과 영양 기준을 충족하는 주식 레시피가 {minimum}개 미만이에요. 자료를 보충하거나 음식 선호를 확인해 주세요.')
        return selected

    def evidence(self, row):
        if row.get('_evidence'):
            return row['_evidence']
        return {'recipeId': str(row['RCP_SEQ']), 'sourceUrl': SOURCE, 'retrievedAt': self.data['retrievedAt'],
                'ingredients': row.get('RCP_PARTS_DTLS', ''), 'servingWeight': row.get('INFO_WGT', ''),
                'nutrition': {k: str(row.get(k, '')) for k in ('INFO_ENG', 'INFO_CAR', 'INFO_PRO', 'INFO_FAT', 'INFO_NA')},
                'fingerprint': hashlib.sha256(json.dumps(row, sort_keys=True, ensure_ascii=False).encode()).hexdigest()}


if __name__ == '__main__':
    from app import load_env
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument('--sample', action='store_true')
    parser.add_argument('--build-index', action='store_true')
    args = parser.parse_args()
    try:
        path = collect(args.sample)
        catalog = FoodCatalog(path)
        print('Collected recipes:', len(catalog.rows), '| sample:', args.sample)
        if args.build_index: print('New embeddings:', catalog.index.build(batch_size=32))
    except Exception as error:
        # URL errors can include the credential-bearing URL, so print no exception body.
        print('Collection/index failed:', type(error).__name__)
        raise SystemExit(1)
