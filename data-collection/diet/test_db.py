import os
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma

# 환경 변수 로드 (API 키)
load_dotenv()

print("Chroma DB 정밀 진단을 시작합니다...\n")

try:
    # 1. 임베딩 모델 (반드시 성공했던 그 모델명!)
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    # 2. DB 연결
    vectorstore = Chroma(collection_name="diet_rag", persist_directory="./chroma_db", embedding_function=embeddings)

    # 3. 저장된 총 데이터 개수 확인
    count = vectorstore._collection.count()
    print(f"현재 DB에 저장된 데이터 총 개수: {count}개")

    if count == 0:
        print("DB가 텅 비어있습니다. build_db.py 실행이 제대로 안 되었거나, 저장 경로가 다릅니다.")
    else:
        print("데이터 저장 확인 완료!\n")

        # 4. 검색(Retrieval) 테스트
        test_query = "단백질이 풍부한 식단"
        print(f"검색 테스트 진행 중... (검색어: '{test_query}')")

        # 가장 유사한 데이터 3개 가져오기
        results = vectorstore.similarity_search(test_query, k=3)

        if not results:
            print("데이터는 있는데 검색이 안 됩니다! (임베딩 규격이 깨졌을 확률이 높습니다)")
        else:
            print(f"성공적으로 {len(results)}개의 데이터를 찾았습니다!\n")
            print("--- [검색된 데이터 실제 내용] ---")
            for i, doc in enumerate(results, 1):
                print(f"[{i}번째 데이터]")
                print(doc.page_content)
                print("-" * 40)

except Exception as e:
    print(f"❌ 오류 발생: {e}")