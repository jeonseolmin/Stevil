import { useEffect, useRef, useState } from "react";
import { askRag, getRagStatus } from "../../api/ragApi";
import "./WegovyChatPage.css";

const EXAMPLES = [
    ["투약 방법", "주사 맞는 날을 깜빡했어요"],
    ["주의사항", "임신 관련 주의사항을 알려주세요"],
    ["연구 살펴보기", "SELECT 연구의 대상과 주요 결과는 무엇인가요?"],
    ["해외 자료", "미국 허가사항의 주의사항을 알려주세요"],
];
const TYPES = { label: "허가사항", trial: "임상 연구", safety_notice: "안전성 공지" };
const COUNTRIES = { KR: "대한민국", US: "미국", EU: "유럽", MULTI: "다국가 연구" };
const FORMS = { injection: "주사제", oral: "경구제", mixed: "여러 제형 포함", unspecified: "제형 미확인" };

function Mark({ book = false }) {
    return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        {book ? <><path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a5 5 0 0 0-4 1 5 5 0 0 0-4-1H3z" /></> : <><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" /><path d="M7 10h8M7 14h5" /></>}
    </svg>;
}

function AnswerText({ text, messageIndex, sources }) {
    return text.split(/(\[\d+\]|\*\*[^*]+\*\*)/g).map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match && sources[Number(match[1]) - 1]) {
            const id = `source-${messageIndex}-${Number(match[1]) - 1}`;
            return <a key={index} className="wegovy-chat__citation" href={`#${id}`} aria-label={`출처 ${match[1]} 확인`}
                onClick={() => { const node = document.getElementById(id); if (node) node.open = true; }}>{part}</a>;
        }
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        return part;
    });
}

export default function WegovyChatPage({ embedded = false, preview = false }) {
    const designPreview = import.meta.env.DEV && preview;
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState("");
    const busy = useRef(false);
    const input = useRef(null);
    const conversation = useRef(null);

    useEffect(() => {
        if (designPreview) return;
        let active = true;
        getRagStatus().then((data) => { if (active) setStatus(data); })
            .catch((err) => { if (active) setError(err.message); });
        return () => { active = false; };
    }, [designPreview]);

    useEffect(() => {
        if (conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;
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
            const response = designPreview ? {
                answer: "궁금한 점을 편하게 남겨 주세요. 실제 서비스에서는 관련 자료를 찾아 답변과 출처를 함께 안내해 드려요.\n\n이 답변은 대화창의 모양을 확인하기 위한 디자인 예시입니다.",
                sources: [], mode: "design_preview", notice: "디자인 미리보기 · 실제 검색이나 API 요청은 전송하지 않았습니다.",
            } : await askRag(text);
            setMessages((previous) => [...previous, { question: text, ...response }]);
            setQuestion("");
        } catch (err) {
            setError(err.name === "TimeoutError" ? "답변을 받는 데 시간이 걸리고 있어요. 잠시 후 다시 보내 주세요." : err.message);
        } finally {
            busy.current = false;
            setLoading(false);
            setPending("");
        }
    }

    return <section className={`wegovy-chat${embedded ? ' wegovy-chat--embedded' : ''}`}>
        <div className="wegovy-chat__container">
            {!embedded && <header className="wegovy-chat__heading">
                <span className="wegovy-chat__eyebrow">STEVIL GUIDE</span>
                <h1>궁금한 위고비, 근거와 함께</h1>
                <p>투약 중 궁금한 점을 물어보고, 답변의 출처까지 확인해 보세요.</p>
            </header>}
            <div className="wegovy-chat__layout">
                <div className="wegovy-chat__panel">
                    <div className="wegovy-chat__toolbar">
                        <div className="wegovy-chat__identity"><span className="wegovy-chat__avatar"><Mark /></span><div><strong>위고비 AI 도우미</strong><small>궁금한 점을 편하게 물어보세요</small></div></div>
                        <button className="wegovy-chat__reset" disabled={!messages.length || loading} onClick={() => { setMessages([]); setError(""); setQuestion(""); input.current?.focus(); }}>새 대화 ↗</button>
                    </div>
                    {embedded && <p className="wegovy-chat__embedded-notice">투약 결정은 의료진과 상의해 주세요.{status?.preview && ' · 검토 전 자료 미리보기'}</p>}
                    <div className="wegovy-chat__messages" ref={conversation} role="log" aria-label="위고비 질문과 답변" aria-live="polite" tabIndex={0}>
                        {!messages.length && !loading && <div className="wegovy-chat__welcome">
                            <span className="wegovy-chat__welcome-icon"><Mark book /></span>
                            <h2>어떤 점이 궁금하세요?</h2>
                            <p>국내외 허가사항과 연구 자료를 찾아<br />이해하기 쉽게 안내해 드릴게요.</p>
                            <div className="wegovy-chat__examples">{EXAMPLES.map(([label, text]) => <button key={label} onClick={() => selectQuestion(text)}><span>{label}</span><strong>{text}</strong><i aria-hidden="true">↗</i></button>)}</div>
                        </div>}
                        {messages.map((message, index) => <article key={index} className="wegovy-chat__turn">
                            <div className="wegovy-chat__question"><span className="wegovy-chat__sr">내 질문: </span>{message.question}</div>
                            <div className="wegovy-chat__reply"><div className="wegovy-chat__reply-label"><Mark /><strong>위고비 도우미</strong><span>{message.mode === "evidence" ? "원문 검색 결과" : "자료 기반 답변"}</span></div>
                                <div className="wegovy-chat__answer"><AnswerText text={message.answer} sources={message.sources} messageIndex={index} /></div>
                                {message.notice && <p className="wegovy-chat__notice">{message.notice}</p>}
                                {!!message.sources.length && <div className="wegovy-chat__sources"><h3><Mark book />답변에 참고한 자료 <span>{message.sources.length}</span></h3>
                                    {message.sources.map((source, sourceIndex) => <details className="wegovy-chat__source" id={`source-${index}-${sourceIndex}`} key={source.id}>
                                        <summary><span className="wegovy-chat__source-number">{sourceIndex + 1}</span><span><strong>{source.title}</strong><small>{COUNTRIES[source.jurisdiction] || source.jurisdiction} · {TYPES[source.document_type] || "참고 자료"}{source.page ? ` · ${source.page}페이지` : ` · ${source.section}`}</small></span></summary>
                                        <div className="wegovy-chat__source-body"><p>수집 {source.collected_at.slice(0, 10)} · 개정일 {source.revision_date || "미확인"}<br />{source.review_status === "approved" ? "검토 승인" : "검토 대기"} · 최신성 {source.latest_version_verified ? "확인" : "미확인"} · {FORMS[source.formulation] || "제형 미확인"}{!source.formulation_verified && " (제형 검토 전)"}</p>
                                            <a href={source.url} target="_blank" rel="noopener noreferrer">출처 원문 보기 ↗</a><div className="wegovy-chat__excerpt" tabIndex={0} aria-label="검색된 원문">{source.text}</div></div>
                                    </details>)}
                                </div>}
                            </div>
                        </article>)}
                        {loading && <div className="wegovy-chat__turn"><div className="wegovy-chat__question">{pending}</div><p className="wegovy-chat__loading" role="status"><span aria-hidden="true">•••</span>관련 자료를 확인하고 있어요</p></div>}
                    </div>
                    <div className="wegovy-chat__composer">
                        {error && <p className="wegovy-chat__error" role="alert">{error}</p>}
                        <form onSubmit={submit}>
                            <label className="wegovy-chat__sr" htmlFor="wegovy-question">위고비 질문</label>
                            <textarea ref={input} id="wegovy-question" value={question} onChange={(event) => setQuestion(event.target.value)} minLength={2} maxLength={1000} rows={2} required disabled={loading} placeholder="위고비에 대해 궁금한 점을 입력해 주세요" />
                            <div className="wegovy-chat__send-row"><span>{question.length} / 1,000</span><button type="submit" disabled={loading || question.trim().length < 2}>{loading ? "답변 준비 중" : "질문 보내기"}<span aria-hidden="true">↑</span></button></div>
                        </form>
                        <p>질문마다 독립적으로 검색해요. 이름 등 개인정보는 입력하지 마세요.</p>
                    </div>
                </div>
                {!embedded && <aside className="wegovy-chat__aside">
                    <section className="wegovy-chat__guide"><span className="wegovy-chat__guide-icon"><Mark book /></span><h2>출처를 확인할 수 있는 답변</h2><p>답변의 숫자를 누르면 참고한 원문과 문서 정보를 확인할 수 있어요.</p><ul><li><strong>국내 허가사항부터</strong><span>일반적인 질문은 식약처 자료를 찾아요.</span></li><li><strong>더 궁금한 내용까지</strong><span>미국·유럽 기준이나 연구가 궁금하다면 질문에 함께 적어 주세요.</span></li><li><strong>원문과 함께 확인</strong><span>해외 기준은 국내 허가사항과 다를 수 있어요.</span></li></ul></section>
                    <section className="wegovy-chat__care"><h2>이용 전 확인해 주세요</h2><p>답변은 정보 제공을 위한 참고 자료예요. 투약 여부와 용량 변경은 의료진과 상의해 주세요.</p>{status?.preview && <span className="wegovy-chat__preview">검토 전 자료를 사용하는 미리보기</span>}{status && !status.generation_ready && <p>현재는 관련 원문을 찾아 보여드려요.</p>}<small>대화는 이 화면에서만 유지되며 새로고침하면 사라집니다.</small></section>
                </aside>}
            </div>
        </div>
    </section>;
}
