import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import WegovyChatPage from "../../pages/rag/WegovyChatPage";
import "./DashboardChatWidget.css";

export default function DashboardChatWidget({ preview = false }) {
    const [params] = useSearchParams();
    const [openedOnce, setOpenedOnce] = useState(() => params.get("chat") === "wegovy");
    const [open, setOpen] = useState(() => params.get("chat") === "wegovy");
    const dialog = useRef(null);
    const launcher = useRef(null);

    useEffect(() => {
        if (!open) return;
        const node = dialog.current;
        const trigger = launcher.current;
        node.showModal();
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            node.close();
            document.body.style.overflow = previous;
            trigger?.focus();
        };
    }, [open]);

    function show() {
        setOpenedOnce(true);
        setOpen(true);
    }

    return <>
        <button type="button" className="dashboard-chat-launcher" ref={launcher} onClick={show}
            aria-haspopup="dialog" aria-expanded={open} aria-controls="dashboard-wegovy-chat">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z" /><path d="M7 10h8M7 14h5" /></svg>
            <span>위고비 궁금하세요?<small>AI 도우미에게 질문하기</small></span>
        </button>
        {createPortal(<dialog ref={dialog} id="dashboard-wegovy-chat" className="dashboard-chat-dialog" aria-labelledby="dashboard-chat-title"
            onCancel={(event) => { event.preventDefault(); setOpen(false); }}>
            <div className="dashboard-chat-dialog__top"><span id="dashboard-chat-title">STEVIL · 건강 질문</span><button type="button" aria-label="위고비 도우미 닫기" onClick={() => setOpen(false)} autoFocus>×</button></div>
            {openedOnce && <WegovyChatPage embedded preview={preview} />}
        </dialog>, document.body)}
    </>;
}
