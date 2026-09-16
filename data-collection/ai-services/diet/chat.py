import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# 1. 환경 변수 로드
load_dotenv()

print("⏳ 스마트 냉장고(Chroma DB) 문을 여는 중...")

# 2. 임베딩 및 Chroma DB 연결
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
vectorstore = Chroma(collection_name="diet_rag", persist_directory="./chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# 3. LLM 설정
llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.3)

# 4. 프롬프트
system_prompt = (
    "당신은 전문적이고 친절한 다이어트 및 영양 코치 AI입니다.\n"
    "제공된 [검색된 식품 데이터]를 반드시 활용하여 사용자의 질문에 답변하세요.\n"
    "데이터에 없는 내용을 지어내지 말고, 단백질 수치 등을 정확하게 전달하세요.\n\n"
    "⚠️ 중요: 만약 사용자가 영양, 다이어트, 식단, 운동 등과 관련 없는 엉뚱한 질문을 하면, "
    "'저는 영양 코치 AI이므로 식단과 건강에 관련된 질문에만 답변할 수 있습니다.'라고 단호하게 거절하세요.\n\n"
    "[검색된 식품 데이터]\n{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

# 5. DB에서 찾은 데이터를 보기 좋게 텍스트로 합쳐주는 함수
def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# 6. 🚀 최신 LCEL 파이프라인 (에러 났던 chains 모듈 완벽 대체!)
rag_chain = (
    {"context": retriever | format_docs, "input": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# 7. 실행부
print("✅ 영양 코치 AI가 준비되었습니다! (종료하려면 'q' 입력)")
print("-" * 50)

while True:
    user_input = input("\n질문: ")
    if user_input.lower() in ['q', 'quit', 'exit']:
        print("영양 코치를 종료합니다. 득근하세요! 💪")
        break

    try:
        # 질문 던지기
        response = rag_chain.invoke(user_input)
        print(f"\n코치 AI: {response}")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")