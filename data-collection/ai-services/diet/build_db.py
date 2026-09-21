import os
import time
import pandas as pd
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

load_dotenv()
DB_DIR = "./chroma_db"

FILES_TO_PROCESS = [
    "filtered/filtered_standard_nutritional_data.csv",
    "filtered/filtered_health_food.xlsx",
    "filtered/filtered_processed_foods.xlsx",
    "filtered/filtered_food.xlsx"
]

def safe_get(row, possible_keys, default=0):
    for key in possible_keys:
        if key in row and pd.notna(row[key]):
            return row[key]
    return default

def process_file(file_path, vectorstore):
    if not os.path.exists(file_path):
        print(f"파일을 찾을 수 없습니다 (스킵): {file_path}")
        return

    print(f"\n [{file_path}] 데이터 추출 시작...")

    try:
        if file_path.endswith('.csv'):
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='cp949')
        else:
            df = pd.read_excel(file_path)
    except Exception as e:
        print(f" 파일 읽기 실패 ({file_path}): {e}")
        return

    # 무료 API 리밋 방지를 위해 배치 사이즈를 100으로 축소
    batch_size = 45
    total_rows = len(df)
    print(f"총 {total_rows}건 발견. {batch_size}건씩 안전하게 나누어 처리합니다.")

    name_keys = ['식품명', '식품이름', '품목명', 'DESC_KOR', '식품명(상세)']
    cal_keys = ['에너지(kcal)', '칼로리', '에너지', 'NUTR_CONT1', '열량(kcal)']
    protein_keys = ['단백질(g)', '단백질', 'NUTR_CONT3']
    carbs_keys = ['탄수화물(g)', '탄수화물', 'NUTR_CONT2']
    fat_keys = ['지방(g)', '지방', 'NUTR_CONT4']

    for i in range(0, total_rows, batch_size):
        batch_df = df.iloc[i : i + batch_size]
        documents = []

        for _, row in batch_df.iterrows():
            food_name = safe_get(row, name_keys, '이름 없음')
            if food_name == '이름 없음':
                continue

            calories = safe_get(row, cal_keys, 0)
            protein = safe_get(row, protein_keys, 0)
            carbs = safe_get(row, carbs_keys, 0)
            fat = safe_get(row, fat_keys, 0)

            if calories == 0 and protein == 0 and carbs == 0 and fat == 0:
                continue

            doc_content = f"식품명: {food_name}, 칼로리: {calories}kcal, 탄수화물: {carbs}g, 단백질: {protein}g, 지방: {fat}g"
            metadata = {"source": file_path, "food_name": str(food_name)}

            documents.append(Document(page_content=doc_content, metadata=metadata))

        if documents:
            # 에러가 나면 죽지 않고 대기했다가 다시 시도
            success = False
            while not success:
                try:
                    vectorstore.add_documents(documents)
                    success = True
                    print(f"[{min(i + batch_size, total_rows)} / {total_rows}] 저장 완료...")
                    time.sleep(40) # 100건마다 10초씩 안정적으로 휴식
                except Exception as e:
                    error_msg = str(e)
                    # 429 에러(할당량 초과) 발생 시 40초간 딥슬립 후 재시도
                    if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                        print(" 구글 API 속도 제한 걸림! 40초 대기 후 다시 시도합니다... ")
                        time.sleep(40)
                    else:
                        print(f"알 수 없는 에러 발생 : {error_msg}")
                        break # 다른 에러면 일단 빠져나감

def build_full_database():
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    vectorstore = Chroma(
        collection_name="diet_rag",
        persist_directory=DB_DIR,
        embedding_function=embeddings
    )

    for file_name in FILES_TO_PROCESS:
        process_file(file_name, vectorstore)

    print("\n모든 파일의 데이터베이스 구축이 완료되었습니다!")

if __name__ == "__main__":
    build_full_database()