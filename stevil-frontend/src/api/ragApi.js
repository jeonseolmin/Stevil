import axiosInstance from "./axiosInstance";

// Reuse the login token and refresh flow; no Gemini credentials in the browser.
async function request(path, options = {}) {
    try {
        const response = await axiosInstance({
            baseURL: "/rag-api", url: `/${path}`, timeout: 100000,
            method: options.method || "GET",
            data: options.body ? JSON.parse(options.body) : undefined,
        });
        return response.data;
    } catch (error) {
        const status = error.response?.status;
        if (status === 429) throw new Error("질문이 잠시 몰렸어요. 잠시 기다린 뒤 다시 보내 주세요.", { cause: error });
        if (status === 401 || status === 403) throw new Error("로그인 상태를 확인한 뒤 다시 이용해 주세요.", { cause: error });
        throw new Error(error.response?.data?.error || "RAG 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", { cause: error });
    }
}

export const getRagStatus = () => request("status");
export const askRag = (question) => request("chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
});
