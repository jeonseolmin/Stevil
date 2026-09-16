import pandas as pd
import os

# 원본 가공식품 파일 (바탕화면 diet 폴더 기준)
file_path = "processed_foods.xlsx"
# 기존에 만들어둔 filtered 폴더 안에 덮어쓰기
output_path = "filtered/filtered_processed_foods.xlsx"

print(f"\n[{file_path}] 로딩 중... (단백질 15g 초과 정밀 타격 )")

try:
    df = pd.read_excel(file_path)
    original_count = len(df)

    protein_keys = ['단백질(g)', '단백질', 'NUTR_CONT3']
    target_col = None

    for col in protein_keys:
        if col in df.columns:
            target_col = col
            break

    if target_col is not None:
        # 안전한 숫자 변환
        df[target_col] = pd.to_numeric(df[target_col], errors='coerce').fillna(0)

        # 단백질 15g '초과'인 고단백 식품만 추출
        filtered_df = df[df[target_col] > 15]
        filtered_count = len(filtered_df)

        # filtered 폴더가 없으면 에러 안 나게 안전장치
        os.makedirs("filtered", exist_ok=True)

        print(f"압축 완료: {original_count}건 ➡️ {filtered_count}건 ({(filtered_count/original_count*100):.1f}%) 남음")
        print(f"[{output_path}] 파일로 덮어쓰는 중...")

        filtered_df.to_excel(output_path, index=False)
        print("가공식품 다이어트 완료! 이제 진짜 영양가 있는 데이터만 남았습니다.")
    else:
        print("단백질 컬럼을 찾을 수 없습니다.")

except Exception as e:
    print(f"처리 중 에러 발생: {e}")