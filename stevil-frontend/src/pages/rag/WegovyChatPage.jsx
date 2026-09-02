import { useEffect, useRef, useState } from "react";
import { askRag, getRagStatus } from "../../api/ragApi";
import "./WegovyChatPage.css";

export default function WegovyChatPage() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const busy = useRef(false);

    useEffect(() => {
        let active = true;
        getRagStatus().then((data) => { if (active) setStatus(data); })
            .catch((err) => { if (active) setError(err.message); });
        return () => { active = false; };
    }, []);

    async function submit(event) {
        event.preventDefault();
        const text = question.trim();
        if (busy.current || text.length < 2) return;
        busy.current = true;
        setLoading(true);
        setError("");
        try {
            const response = await askRag(text);
            setMessages((previous) => [...previous, { question: text, ...response }]);
            setQuestion("");
        } catch (err) {
            setError(err.name === "TimeoutError" ? "응답 시간이 길어지고 있습니다. 다시 시도해 주세요." : err.message);
        } finally {
            busy.current = false;
            setLoading(false);
        }
    }

    return (
        <section className="wegovy-chat">
            <header>
                <p className="wegovy-chat__eyebrow">WEGOVY · 근거와 함께</p>
                <h1>위고비 질문하기</h1>
                <p>국내 허가사항과 해외 허가·연구·안전성 자료에서 답변과 출처를 확인하세요.</p>
            </header>
            <div className="wegovy-chat__notice">
                {status?.preview ? "검토 전 자료를 사용하는 개발 미리보기입니다. " : "승인된 자료만 검색합니다. "}
                답변은 참고용이며, 개인별 투약 판단은 의료진과 상의해 주세요.
                {status && !status.generation_ready && <p>현재 원문 검색 모드입니다. 관련 문서와 출처를 보여드립니다.</p>}
            </div>
            <div className="wegovy-chat__messages" aria-live="polite">
                {messages.length === 0 && <p>예: 임신 관련 주의사항은 무엇인가요?</p>}
                {messages.map((message, index) => (
                    <article key={index} className="wegovy-chat__message">
                        <h2>{message.question}</h2>
                        <p className="wegovy-chat__answer">{message.answer}</p>
                        {message.notice && <p>{message.notice}</p>}
                        {message.sources.map((source, sourceIndex) => (
                            <details className="wegovy-chat__source" key={source.id}>
                                <summary>[{sourceIndex + 1}] {source.title} · {source.section}</summary>
                                <p>수집: {source.collected_at.slice(0, 10)} · 개정일: {source.revision_date || "미확인"} · {source.review_status === "approved" ? "검토 승인" : "검토 대기"} · 최신성: {source.latest_version_verified ? "확인" : "미확인"}</p>
                                <p>{source.jurisdiction} · {source.publisher} · {source.document_type}{source.page ? ` · PDF ${source.page}페이지` : ''} · 제형: {source.formulation} (검토 전)</p>
                                <a href={source.url} target="_blank" rel="noopener noreferrer">출처 원문 열기 ↗</a>
                                <p className="wegovy-chat__excerpt">{source.text}</p>
                            </details>
                        ))}
                    </article>
                ))}
                {loading && <p role="status">자료를 검색하고 답변을 준비하고 있습니다…</p>}
            </div>
            {error && <p className="wegovy-chat__error" role="alert">{error}</p>}
            <form onSubmit={submit} className="wegovy-chat__form">
                <label htmlFor="wegovy-question">질문</label>
                <textarea id="wegovy-question" value={question} onChange={(event) => setQuestion(event.target.value)}
                    minLength={2} maxLength={1000} rows={3} required disabled={loading}
                    placeholder="위고비에 대해 궁금한 점을 입력하세요." />
                <button type="submit" disabled={loading || question.trim().length < 2}>{loading ? "답변 준비 중" : "질문 보내기"}</button>
            </form>
            <p className="wegovy-chat__help">질문마다 독립적으로 검색합니다. 개인정보를 입력하지 마세요. 새로고침하면 대화가 사라집니다.</p>
        </section>
    );
}
