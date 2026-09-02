// Same-origin Vite proxy. No Gemini credentials belong in the browser.
async function request(path, options = {}) {
    const response = await fetch(`/rag-api/${path}`, {
        ...options,
        signal: AbortSignal.timeout(100000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
        throw new Error(data?.error || "RAG 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    return data;
}

export const getRagStatus = () => request("status");
export const askRag = (question) => request("chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
});
