# ai_server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

app = FastAPI()

# React에서 파이썬 서버로 접근할 수 있도록 CORS 문 열어주기
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 개발 단계이므로 모든 주소 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. RAG 챗봇 셋업 (서버가 켜질 때 DB 딱 한 번만 연결)
print("스마트 냉장고(Chroma DB) 연결 중...")
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
vectorstore = Chroma(collection_name="diet_rag", persist_directory="./chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.3)

system_prompt = (
    "당신은 전문적이고 친절한 다이어트 및 영양 코치 AI입니다.\n"
        "🚨 [가장 중요한 규칙]: 사용자의 질문이 식단, 영양, 다이어트, 식품, 건강 관리와 전혀 관련이 없는 질문(예: 코딩, 날씨, 역사, 일반적인 잡담 등)이라면, "
        "절대 아는 척하거나 답변하지 말고 반드시 아래의 문장만 정확하게 출력하세요.\n"
        "\"죄송합니다. 저는 식단 및 영양 코치입니다. 제가 알아들을 수 없는 질문이네요. 😅 식단이나 영양소와 관련된 이야기를 해주시면 자세히 도와드리겠습니다!\"\n\n"
        "사용자의 질문이 식단과 관련이 있다면, 제공된 [검색된 식품 데이터]를 반드시 활용하여 전문적으로 답변하세요.\n"
        "데이터에 없는 수치를 임의로 지어내지 말고 팩트 기반으로 답변하세요.\n\n"
        "[검색된 식품 데이터]\n{context}"
)

prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}"),
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

rag_chain = (
    {"context": retriever | format_docs, "input": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# 2. React와 주고받을 데이터 규격 정의
class ChatRequest(BaseModel):
    question: str

# 3. React가 호출할 API 엔드포인트 생성
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        # React에서 보낸 질문(req.question)을 RAG 체인에 넣고 답변 생성
        response = rag_chain.invoke(req.question)
        return {"answer": response}
    except Exception as e:
        return {"error": str(e)}