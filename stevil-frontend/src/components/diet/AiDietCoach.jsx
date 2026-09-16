import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './AiDietCoach.css';

const AiDietCoach = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([
    { type: 'bot', text: '안녕하세요! 다이어트 AI 코치입니다. 식단이나 단백질에 대해 궁금한 점을 물어보세요!' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // 채팅이 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isLoading]);

  // form 제출을 처리하는 함수
  const handleAsk = async (e) => {
    e.preventDefault();

    // 질문이 비어있거나, 이미 답변을 기다리는 중이면 무시 (따닥 클릭 방어)
    if (!question.trim() || isLoading) return;

    const newQuestion = question;
    setChatLog((prev) => [...prev, { type: 'user', text: newQuestion }]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await axios.post('/rag-api/chat', { 
        question: newQuestion 
      });
      if (response.data.answer) {
        setChatLog((prev) => [...prev, { type: 'bot', text: response.data.answer }]);
      } else if (response.data.error) {
        setChatLog((prev) => [...prev, { type: 'bot', text: `🚨 파이썬 내부 에러: ${response.data.error}` }]);
      } else {
        setChatLog((prev) => [...prev, { type: 'bot', text: `🚨 알 수 없는 응답: ${JSON.stringify(response.data)}` }]);
      }
      
    } catch (error) {
      console.error("AI 서버 통신 에러:", error);
      setChatLog((prev) => [...prev, { type: 'bot', text: '서버와 연결할 수 없습니다. 다시 시도해 주세요.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button className="ai-coach-fab" onClick={() => setIsOpen(true)}>
         AI 식단 코치
        </button>
      )}

      {isOpen && (
        <div className="ai-coach-window">
          <div className="ai-coach-header">
            <h4>영양 코치</h4>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="ai-coach-body">
            {chatLog.map((chat, idx) => (
              <div key={idx} className={`ai-chat-bubble ${chat.type}`}>
                {chat.text}
              </div>
            ))}
            {isLoading && <div className="ai-chat-bubble bot typing">답변을 요리하고 있어요...</div>}
            <div ref={chatEndRef} />
          </div>

          {/* 껍데기를 div에서 form으로 변경하여 엔터키 완벽 제어 */}
          <form className="ai-coach-input" onSubmit={handleAsk}>
            <input 
              type="text" 
              placeholder="예: 단백질 높은 식단 추천해줘" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading}>전송</button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiDietCoach;