import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axiosInstance from "../../../api/axiosInstance";
import "./AdminInquiriesPage.css";

const PAGE_SIZE = 20;

const CATEGORY_LABELS = {
    ACCOUNT: "계정",
    MEDICAL_FACILITY: "병원·약국",
    SERVICE: "서비스",
    PAYMENT: "결제",
    BUG: "오류 신고",
    ETC: "기타",
};

const STATUS_LABELS = {
    PENDING: "답변 대기",
    IN_PROGRESS: "처리 중",
    ANSWERED: "답변 완료",
    CLOSED: "종료",
};

function formatDate(value) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export default function AdminInquiriesPage() {
    const [inquiries, setInquiries] = useState([]);

    const [keyword, setKeyword] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [selectedInquiry, setSelectedInquiry] =
        useState(null);
    const [answer, setAnswer] = useState("");

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const loadInquiries = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                "/admin/inquiries",
                {
                    params: {
                        page,
                        size: PAGE_SIZE,
                        sort: "createdAt,desc",
                        keyword:
                            searchKeyword.trim() || undefined,
                        category: category || undefined,
                        status: status || undefined,
                    },
                }
            );

            const data = response.data;

            setInquiries(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setTotalElements(data.totalElements ?? 0);
        } catch (error) {
            console.error("문의 목록 조회 실패:", error);

            setErrorMessage(
                error.response?.data?.message ??
                "문의 목록을 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    }, [page, searchKeyword, category, status]);

    useEffect(() => {
        loadInquiries();
    }, [loadInquiries]);

    const replaceInquiry = (updatedInquiry) => {
        setInquiries((current) =>
            current.map((inquiry) =>
                inquiry.id === updatedInquiry.id
                    ? updatedInquiry
                    : inquiry
            )
        );

        setSelectedInquiry(updatedInquiry);
    };

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(0);
        setSearchKeyword(keyword);
    };

    const handleResetFilters = () => {
        setKeyword("");
        setSearchKeyword("");
        setCategory("");
        setStatus("");
        setPage(0);
    };

    const handleOpenDetail = async (inquiryId) => {
        try {
            setProcessing(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                `/admin/inquiries/${inquiryId}`
            );

            setSelectedInquiry(response.data);
            setAnswer(response.data.answer ?? "");
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "문의 상세 정보를 불러오지 못했습니다."
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleCloseDetail = () => {
        setSelectedInquiry(null);
        setAnswer("");
    };

    const handleStartProcessing = async () => {
        if (!selectedInquiry) {
            return;
        }

        const confirmed = window.confirm(
            "이 문의의 처리를 시작하시겠습니까?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessing(true);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/inquiries/${selectedInquiry.id}/processing`
            );

            replaceInquiry(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "문의 상태를 변경하지 못했습니다."
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleSubmitAnswer = async (event) => {
        event.preventDefault();

        const trimmedAnswer = answer.trim();

        if (!trimmedAnswer) {
            setErrorMessage("답변 내용을 입력해 주세요.");
            return;
        }

        if (trimmedAnswer.length > 5000) {
            setErrorMessage(
                "답변은 5000자 이하로 입력해 주세요."
            );
            return;
        }

        try {
            setProcessing(true);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/inquiries/${selectedInquiry.id}/answer`,
                {
                    answer: trimmedAnswer,
                }
            );

            replaceInquiry(response.data);
            setAnswer(response.data.answer ?? "");
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "문의 답변을 등록하지 못했습니다."
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleCloseInquiry = async () => {
        const confirmed = window.confirm(
            "이 문의를 종료 처리하시겠습니까?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessing(true);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/inquiries/${selectedInquiry.id}/close`
            );

            replaceInquiry(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "문의를 종료하지 못했습니다."
            );
        } finally {
            setProcessing(false);
        }
    };

    return (
        <section className="admin-inquiries-page">
            <header className="admin-inquiries-heading">
                <div>
                    <span>INQUIRY MANAGEMENT</span>
                    <h1>문의 관리</h1>
                    <p>
                        사용자가 등록한 문의를 확인하고 답변과
                        처리 상태를 관리합니다.
                    </p>
                </div>

                <div className="admin-inquiries-count">
                    <span>조회된 문의</span>
                    <strong>
                        {totalElements.toLocaleString()}
                    </strong>
                </div>
            </header>

            <form
                className="admin-inquiries-filter"
                onSubmit={handleSearch}
            >
                <input
                    type="search"
                    value={keyword}
                    onChange={(event) =>
                        setKeyword(event.target.value)
                    }
                    placeholder="문의 제목 또는 내용 검색"
                />

                <select
                    value={category}
                    onChange={(event) => {
                        setCategory(event.target.value);
                        setPage(0);
                    }}
                >
                    <option value="">전체 분류</option>

                    {Object.entries(CATEGORY_LABELS).map(
                        ([value, label]) => (
                            <option
                                key={value}
                                value={value}
                            >
                                {label}
                            </option>
                        )
                    )}
                </select>

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(0);
                    }}
                >
                    <option value="">전체 상태</option>

                    {Object.entries(STATUS_LABELS).map(
                        ([value, label]) => (
                            <option
                                key={value}
                                value={value}
                            >
                                {label}
                            </option>
                        )
                    )}
                </select>

                <button type="submit">검색</button>

                <button
                    type="button"
                    className="admin-inquiries-reset"
                    onClick={handleResetFilters}
                >
                    초기화
                </button>
            </form>

            {errorMessage && (
                <div
                    className="admin-inquiries-error"
                    role="alert"
                >
                    <span>{errorMessage}</span>

                    <button
                        type="button"
                        onClick={() => setErrorMessage("")}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="admin-inquiries-table-card">
                {loading ? (
                    <div className="admin-inquiries-state">
                        <div className="admin-inquiries-spinner" />
                        <p>문의 목록을 불러오고 있습니다.</p>
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="admin-inquiries-state">
                        <strong>조회된 문의가 없습니다.</strong>
                        <p>검색 조건을 변경해 주세요.</p>
                    </div>
                ) : (
                    <div className="admin-inquiries-table-wrapper">
                        <table className="admin-inquiries-table">
                            <thead>
                            <tr>
                                <th>번호</th>
                                <th>분류</th>
                                <th>문의 제목</th>
                                <th>회원</th>
                                <th>처리 상태</th>
                                <th>등록일</th>
                                <th>관리</th>
                            </tr>
                            </thead>

                            <tbody>
                            {inquiries.map((inquiry) => (
                                <tr key={inquiry.id}>
                                    <td>#{inquiry.id}</td>

                                    <td>
                                            <span className="admin-inquiry-category">
                                                {CATEGORY_LABELS[
                                                        inquiry
                                                            .category
                                                        ] ??
                                                    inquiry.category}
                                            </span>
                                    </td>

                                    <td className="admin-inquiry-title">
                                        <strong>
                                            {inquiry.title}
                                        </strong>

                                        <small>
                                            {inquiry.content}
                                        </small>
                                    </td>

                                    <td>
                                        ID {inquiry.userId}
                                    </td>

                                    <td>
                                            <span
                                                className={`admin-inquiry-status admin-inquiry-status--${inquiry.status?.toLowerCase()}`}
                                            >
                                                {STATUS_LABELS[
                                                        inquiry.status
                                                        ] ??
                                                    inquiry.status}
                                            </span>
                                    </td>

                                    <td>
                                        {formatDate(
                                            inquiry.createdAt
                                        )}
                                    </td>

                                    <td>
                                        <button
                                            type="button"
                                            className="admin-inquiry-detail-button"
                                            onClick={() =>
                                                handleOpenDetail(
                                                    inquiry.id
                                                )
                                            }
                                        >
                                            상세·답변
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="admin-inquiries-pagination">
                        <button
                            type="button"
                            disabled={page === 0}
                            onClick={() =>
                                setPage((current) =>
                                    Math.max(current - 1, 0)
                                )
                            }
                        >
                            이전
                        </button>

                        <span>
                            <strong>{page + 1}</strong>
                            <em>/</em>
                            {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={
                                page + 1 >= totalPages
                            }
                            onClick={() =>
                                setPage(
                                    (current) => current + 1
                                )
                            }
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>

            {selectedInquiry && (
                <div
                    className="admin-inquiry-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            handleCloseDetail();
                        }
                    }}
                >
                    <section className="admin-inquiry-modal">
                        <header>
                            <div>
                                <span>INQUIRY DETAIL</span>
                                <h2>문의 상세</h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseDetail}
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-inquiry-detail-heading">
                            <div>
                                <span className="admin-inquiry-category">
                                    {CATEGORY_LABELS[
                                        selectedInquiry.category
                                        ]}
                                </span>

                                <span
                                    className={`admin-inquiry-status admin-inquiry-status--${selectedInquiry.status?.toLowerCase()}`}
                                >
                                    {STATUS_LABELS[
                                        selectedInquiry.status
                                        ]}
                                </span>
                            </div>

                            <h3>{selectedInquiry.title}</h3>

                            <p>
                                회원 ID {selectedInquiry.userId}
                                <span>·</span>
                                {formatDate(
                                    selectedInquiry.createdAt
                                )}
                            </p>
                        </div>

                        <article className="admin-inquiry-content">
                            <strong>문의 내용</strong>
                            <p>{selectedInquiry.content}</p>
                        </article>

                        {selectedInquiry.answer && (
                            <article className="admin-inquiry-existing-answer">
                                <strong>등록된 답변</strong>
                                <p>{selectedInquiry.answer}</p>
                                <small>
                                    답변 관리자 ID:{" "}
                                    {selectedInquiry.answeredBy ??
                                        "-"}
                                    <span>·</span>
                                    {formatDate(
                                        selectedInquiry.answeredAt
                                    )}
                                </small>
                            </article>
                        )}

                        {selectedInquiry.status !==
                            "CLOSED" && (
                                <form
                                    className="admin-inquiry-answer-form"
                                    onSubmit={handleSubmitAnswer}
                                >
                                    <label htmlFor="inquiryAnswer">
                                        관리자 답변
                                    </label>

                                    <textarea
                                        id="inquiryAnswer"
                                        value={answer}
                                        maxLength={5000}
                                        placeholder="사용자에게 전달할 답변을 입력해 주세요."
                                        onChange={(event) =>
                                            setAnswer(
                                                event.target.value
                                            )
                                        }
                                    />

                                    <small>
                                        {answer.length} / 5000
                                    </small>

                                    <div className="admin-inquiry-answer-actions">
                                        {selectedInquiry.status ===
                                            "PENDING" && (
                                                <button
                                                    type="button"
                                                    className="processing"
                                                    disabled={processing}
                                                    onClick={
                                                        handleStartProcessing
                                                    }
                                                >
                                                    처리 시작
                                                </button>
                                            )}

                                        <button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing
                                                ? "처리 중..."
                                                : selectedInquiry.answer
                                                    ? "답변 수정"
                                                    : "답변 등록"}
                                        </button>

                                        <button
                                            type="button"
                                            className="close"
                                            disabled={processing}
                                            onClick={
                                                handleCloseInquiry
                                            }
                                        >
                                            문의 종료
                                        </button>
                                    </div>
                                </form>
                            )}

                        {selectedInquiry.status ===
                            "CLOSED" && (
                                <div className="admin-inquiry-closed-notice">
                                    종료된 문의입니다.
                                </div>
                            )}
                    </section>
                </div>
            )}
        </section>
    );
}