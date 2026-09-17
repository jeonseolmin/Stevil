import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./AiDietCoach.css";

const EXAMPLES = [
  ["단백질 식단", "닭가슴살 말고 다른 고단백 식품 추천해줘"],
  ["칼로리 계산", "하루 1500kcal 다이어트 식단 짜줘"],
  ["간식 추천", "다이어트 중 입터짐 방지용 간식은?"],
  ["영양 성분", "탄단지 황금 비율은 어떻게 설정해?"],
];

function Mark({ book = false }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {book ? (
        <path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 1 5 5 0 0 0-4-1H3z" />
      ) : (
        <>
          <path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" />
          <path d="M7 10h8M7 14h5" />
        </>
      )}
    </svg>
  );
}

function AnswerText({ text = "" }) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
}

function ChatTurn({ message }) {
  return (
    <article className="diet-chat__turn">
      <div className="diet-chat__question">
        <span className="diet-chat__sr">내 질문: </span>
        {message.question}
      </div>
      <div className="diet-chat__reply">
        <div className="diet-chat__reply-label">
          <Mark />
          <strong>영양 코치</strong>
          <span>맞춤형 식단 답변</span>
        </div>
        <div className="diet-chat__answer">
          <AnswerText text={message.answer} />
        </div>
      </div>
    </article>
  );
}

export default function AiDietCoach() {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState("");

  const busy = useRef(false);
  const input = useRef(null);
  const conversation = useRef(null);

  useEffect(() => {
    if (conversation.current) {
      conversation.current.scrollTop = conversation.current.scrollHeight;
    }
  }, [messages, loading]);

  function selectQuestion(text) {
    setQuestion(text);
    input.current?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    const text = question.trim();

    if (busy.current || text.length < 2) return;

    busy.current = true;
    setLoading(true);
    setPending(text);
    setError("");

    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
      
      const response = await axios.post(
        "/diet-api/chat",
        { question: text },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
          },
          withCredentials: true,
        }
      );

      let answerText = "";
      if (response.data.answer) {
        answerText = response.data.answer;
      } else if (response.data.error) {
        answerText = `[오류] 파이썬 내부 에러: ${response.data.error}`;
      } else {
        answerText = `[오류] 알 수 없는 응답: ${JSON.stringify(response.data)}`;
      }

      setMessages((prev) => [...prev, { question: text, answer: answerText }]);
      setQuestion("");

    } catch (err) {
      console.error("AI 서버 통신 에러:", err);
      const status = err.response?.status;
      if (status === 401) {
        setError("로그인 인증이 만료되었거나 필요합니다. 다시 로그인해 주세요.");
      } else {
        setError("답변을 요리하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      busy.current = false;
      setLoading(false);
      setPending("");
    }
  }

  return (
    <>
      {!isOpen && (
        <button className="diet-chat-fab" onClick={() => setIsOpen(true)}>
          <div className="diet-chat-fab__icon">
            <Mark />
          </div>
          <div className="diet-chat-fab__text">
            <strong>식단 궁금하세요?</strong>
            <span>AI 도우미에게 질문하기</span>
          </div>
        </button>
      )}

      {isOpen && (
        <div className="diet-chat-window">
          <div className="diet-chat__panel">
            <div className="diet-chat__toolbar">
              <div className="diet-chat__identity">
                <span className="diet-chat__avatar">
                  <Mark />
                </span>
                <div>
                  <strong>AI 식단 코치</strong>
                  <small>영양과 식단을 편하게 물어보세요</small>
                </div>
              </div>
              <div className="diet-chat__actions">
                <button
                  type="button"
                  className="diet-chat__reset"
                  disabled={!messages.length || loading}
                  onClick={() => {
                    setMessages([]);
                    setError("");
                    setQuestion("");
                    input.current?.focus();
                  }}
                >
                  새 대화 ↗
                </button>
                <button
                  type="button"
                  className="diet-chat__close"
                  onClick={() => setIsOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              className="diet-chat__messages"
              ref={conversation}
              role="log"
              aria-label="식단 질문과 답변"
              aria-live="polite"
              tabIndex={0}
            >
              {!messages.length && !loading && (
                <div className="diet-chat__welcome">
                  <span className="diet-chat__welcome-icon">
                    <Mark book />
                  </span>
                  <h2>무엇을 도와드릴까요?</h2>
                  <p>
                    칼로리 계산, 다이어트 간식 추천 등<br />
                    건강한 식습관을 위한 모든 것을 물어보세요.
                  </p>

                  <div className="diet-chat__examples">
                    {EXAMPLES.map(([label, text]) => (
                      <button
                        type="button"
                        key={label}
                        onClick={() => selectQuestion(text)}
                      >
                        <span>{label}</span>
                        <strong>{text}</strong>
                        <i aria-hidden="true">↗</i>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <ChatTurn key={index} message={message} />
              ))}

              {loading && (
                <div className="diet-chat__turn">
                  <div className="diet-chat__question">{pending}</div>
                  <p className="diet-chat__loading" role="status">
                    <span aria-hidden="true">•••</span>
                    답변을 요리하고 있어요
                  </p>
                </div>
              )}
            </div>

            <div className="diet-chat__composer">
              {error && (
                <p className="diet-chat__error" role="alert">
                  {error}
                </p>
              )}

              <form onSubmit={submit}>
                <label className="diet-chat__sr" htmlFor="diet-question">
                  식단 질문
                </label>
                <textarea
                  ref={input}
                  id="diet-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  minLength={2}
                  maxLength={1000}
                  rows={2}
                  required
                  disabled={loading}
                  placeholder="예: 단백질 식단 추천해줘"
                />

                <div className="diet-chat__send-row">
                  <span>{question.length} / 1,000</span>
                  <button type="submit" disabled={loading || question.trim().length < 2}>
                    {loading ? "레시피 확인 중" : "질문 보내기"}
                    <span aria-hidden="true">↑</span>
                  </button>
                </div>
              </form>
              <p>개인정보(이름, 연락처 등)는 입력하지 마세요.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}