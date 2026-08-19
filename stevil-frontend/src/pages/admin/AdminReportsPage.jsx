import {
    useCallback,
    useEffect,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";

import {
    dismissReport,
    getAdminReport,
    getAdminReports,
    resolveReport,
    startReportReview,
} from "../../api/adminReportApi";

import "./AdminReportsPage.css";

const STATUS_OPTIONS = [
    { value: "", label: "전체 상태" },
    { value: "PENDING", label: "검토 대기" },
    { value: "IN_REVIEW", label: "검토 중" },
    { value: "RESOLVED", label: "처리 완료" },
    { value: "DISMISSED", label: "기각" },
];

const TARGET_OPTIONS = [
    { value: "", label: "전체 대상" },
    { value: "POST", label: "게시글" },
    { value: "COMMENT", label: "댓글" },
];

const CATEGORY_OPTIONS = [
    { value: "", label: "전체 사유" },
    { value: "SPAM", label: "스팸" },
    { value: "PROFANITY", label: "욕설·비방" },
    { value: "PROMOTION", label: "홍보·광고" },
    { value: "OTHER", label: "기타" },
];

const STATUS_LABELS = {
    PENDING: "검토 대기",
    IN_REVIEW: "검토 중",
    RESOLVED: "처리 완료",
    DISMISSED: "기각",
};

const TARGET_LABELS = {
    POST: "게시글",
    COMMENT: "댓글",
};

const CATEGORY_LABELS = {
    SPAM: "스팸",
    PROFANITY: "욕설·비방",
    PROMOTION: "홍보·광고",
    OTHER: "기타",
};

const ACTION_LABELS = {
    NONE: "별도 조치 없음",
    CONTENT_DELETED: "콘텐츠 삭제",
};

function formatDateTime(value) {
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

function getErrorMessage(error) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (typeof data === "string" && data.trim()) {
        return data;
    }

    if (data?.message) {
        return data.message;
    }

    if (status === 403) {
        return "관리자만 접근할 수 있습니다.";
    }

    if (status === 401) {
        return "로그인이 필요합니다.";
    }

    return "요청 처리 중 오류가 발생했습니다.";
}

export default function AdminReportsPage() {
    const navigate = useNavigate();

    const [reports, setReports] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [status, setStatus] = useState("");
    const [targetType, setTargetType] = useState("");
    const [category, setCategory] = useState("");

    const [selectedReport, setSelectedReport] =
        useState(null);

    const [action, setAction] = useState("NONE");
    const [adminNote, setAdminNote] = useState("");

    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] =
        useState(false);
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const loadReports = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const data = await getAdminReports({
                page,
                size: 20,
                status,
                targetType,
                category,
            });

            setReports(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setTotalElements(data.totalElements ?? 0);
        } catch (error) {
            const responseStatus = error.response?.status;

            if (responseStatus === 401) {
                localStorage.removeItem("accessToken");
                navigate("/login", { replace: true });
                return;
            }

            if (responseStatus === 403) {
                navigate("/dashboard", {
                    replace: true,
                    state: {
                        errorMessage:
                            "관리자만 접근할 수 있습니다.",
                    },
                });
                return;
            }

            setErrorMessage(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [
        page,
        status,
        targetType,
        category,
        navigate,
    ]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    const handleFilterChange = (setter) => (event) => {
        setter(event.target.value);
        setPage(0);
    };

    const handleOpenDetail = async (reportId) => {
        setDetailLoading(true);
        setErrorMessage("");

        try {
            const data = await getAdminReport(reportId);

            setSelectedReport(data);
            setAction(
                data.adminAction === "CONTENT_DELETED"
                    ? "CONTENT_DELETED"
                    : "NONE"
            );
            setAdminNote(data.adminNote ?? "");
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setDetailLoading(false);
        }
    };

    const handleCloseDetail = () => {
        if (processing) {
            return;
        }

        setSelectedReport(null);
        setAction("NONE");
        setAdminNote("");
    };

    const handleStartReview = async () => {
        if (!selectedReport) {
            return;
        }

        setProcessing(true);
        setErrorMessage("");

        try {
            const updatedReport = await startReportReview(
                selectedReport.id
            );

            setSelectedReport(updatedReport);
            await loadReports();
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setProcessing(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedReport) {
            return;
        }

        if (
            action === "CONTENT_DELETED"
            && !window.confirm(
                "신고 대상 콘텐츠를 실제로 삭제하고 처리 완료하시겠습니까?"
            )
        ) {
            return;
        }

        setProcessing(true);
        setErrorMessage("");

        try {
            const updatedReport = await resolveReport(
                selectedReport.id,
                action,
                adminNote.trim()
            );

            setSelectedReport(updatedReport);
            await loadReports();
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setProcessing(false);
        }
    };

    const handleDismiss = async () => {
        if (!selectedReport) {
            return;
        }

        if (!adminNote.trim()) {
            setErrorMessage("기각 사유를 입력해 주세요.");
            return;
        }

        if (!window.confirm("이 신고를 기각하시겠습니까?")) {
            return;
        }

        setProcessing(true);
        setErrorMessage("");

        try {
            const updatedReport = await dismissReport(
                selectedReport.id,
                adminNote.trim()
            );

            setSelectedReport(updatedReport);
            await loadReports();
        } catch (error) {
            setErrorMessage(getErrorMessage(error));
        } finally {
            setProcessing(false);
        }
    };

    const isCompleted =
        selectedReport?.status === "RESOLVED"
        || selectedReport?.status === "DISMISSED";

    return (
        <section className="admin-reports-page">
            <div className="admin-reports-container">
                <header className="admin-reports-header">
                    <div>
                        <span className="admin-page-eyebrow">
                            ADMIN
                        </span>

                        <h1>신고 관리</h1>

                        <p>
                            접수된 게시글·댓글 신고를 검토하고
                            처리합니다.
                        </p>
                    </div>

                    <div className="admin-report-count">
                        <strong>
                            {totalElements.toLocaleString()}
                        </strong>
                        <span>전체 신고</span>
                    </div>
                </header>

                <div className="admin-report-filters">
                    <label>
                        <span>처리 상태</span>
                        <select
                            value={status}
                            onChange={handleFilterChange(
                                setStatus
                            )}
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>신고 대상</span>
                        <select
                            value={targetType}
                            onChange={handleFilterChange(
                                setTargetType
                            )}
                        >
                            {TARGET_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>신고 사유</span>
                        <select
                            value={category}
                            onChange={handleFilterChange(
                                setCategory
                            )}
                        >
                            {CATEGORY_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <button
                        type="button"
                        className="admin-refresh-button"
                        onClick={loadReports}
                        disabled={loading}
                    >
                        새로고침
                    </button>
                </div>

                {errorMessage && (
                    <div
                        className="admin-report-error"
                        role="alert"
                    >
                        {errorMessage}
                    </div>
                )}

                <div className="admin-report-table-card">
                    <div className="admin-report-table-head">
                        <span>번호</span>
                        <span>상태</span>
                        <span>대상</span>
                        <span>분류</span>
                        <span>신고자</span>
                        <span>접수일</span>
                    </div>

                    {loading ? (
                        <div className="admin-report-state">
                            신고 목록을 불러오고 있습니다.
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="admin-report-state">
                            조건에 맞는 신고가 없습니다.
                        </div>
                    ) : (
                        <div className="admin-report-list">
                            {reports.map((report) => (
                                <button
                                    type="button"
                                    className="admin-report-row"
                                    key={report.id}
                                    onClick={() =>
                                        handleOpenDetail(
                                            report.id
                                        )
                                    }
                                >
                                    <span
                                        data-label="번호"
                                        className="report-number"
                                    >
                                        #{report.id}
                                    </span>

                                    <span data-label="상태">
                                        <span
                                            className={
                                                `report-status `
                                                + `report-status--${report.status?.toLowerCase()}`
                                            }
                                        >
                                            {STATUS_LABELS[
                                                report.status
                                                ] ?? report.status}
                                        </span>
                                    </span>

                                    <span data-label="대상">
                                        {TARGET_LABELS[
                                            report.targetType
                                            ] ?? report.targetType}
                                        {" #"}
                                        {report.targetId}
                                    </span>

                                    <span data-label="분류">
                                        {CATEGORY_LABELS[
                                            report.category
                                            ] ?? report.category}
                                    </span>

                                    <span
                                        data-label="신고자"
                                        className="report-email"
                                    >
                                        {report.reporterEmail}
                                    </span>

                                    <span data-label="접수일">
                                        {formatDateTime(
                                            report.createdAt
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <nav
                    className="admin-report-pagination"
                    aria-label="신고 목록 페이지"
                >
                    <button
                        type="button"
                        onClick={() =>
                            setPage((current) =>
                                Math.max(0, current - 1)
                            )
                        }
                        disabled={page === 0 || loading}
                    >
                        이전
                    </button>

                    <span>
                        {totalPages === 0 ? 0 : page + 1}
                        {" / "}
                        {totalPages}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setPage((current) =>
                                current + 1
                            )
                        }
                        disabled={
                            loading
                            || totalPages === 0
                            || page + 1 >= totalPages
                        }
                    >
                        다음
                    </button>
                </nav>
            </div>

            {(selectedReport || detailLoading) && (
                <div
                    className="admin-report-modal-backdrop"
                    role="presentation"
                    onMouseDown={handleCloseDetail}
                >
                    <article
                        className="admin-report-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="report-detail-title"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        {detailLoading ? (
                            <div className="admin-report-state">
                                신고 상세 정보를 불러오고
                                있습니다.
                            </div>
                        ) : (
                            <>
                                <header className="report-modal-header">
                                    <div>
                                        <span>
                                            신고 #{selectedReport.id}
                                        </span>

                                        <h2 id="report-detail-title">
                                            신고 상세
                                        </h2>
                                    </div>

                                    <button
                                        type="button"
                                        className="report-modal-close"
                                        onClick={handleCloseDetail}
                                        aria-label="신고 상세 닫기"
                                    >
                                        ×
                                    </button>
                                </header>

                                <div className="report-detail-grid">
                                    <div>
                                        <span>상태</span>
                                        <strong>
                                            {STATUS_LABELS[
                                                selectedReport.status
                                                ]}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>대상</span>
                                        <strong>
                                            {TARGET_LABELS[
                                                selectedReport
                                                    .targetType
                                                ]}
                                            {" #"}
                                            {
                                                selectedReport
                                                    .targetId
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>분류</span>
                                        <strong>
                                            {CATEGORY_LABELS[
                                                selectedReport
                                                    .category
                                                ]}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>접수일</span>
                                        <strong>
                                            {formatDateTime(
                                                selectedReport
                                                    .createdAt
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <section className="report-detail-section">
                                    <h3>신고자</h3>
                                    <p>
                                        {
                                            selectedReport
                                                .reporterEmail
                                        }
                                    </p>
                                </section>

                                <section className="report-detail-section">
                                    <h3>신고 내용</h3>
                                    <p className="report-reason">
                                        {selectedReport.reason}
                                    </p>
                                </section>

                                {isCompleted ? (
                                    <section className="report-result-box">
                                        <h3>처리 결과</h3>

                                        <dl>
                                            <div>
                                                <dt>관리자 조치</dt>
                                                <dd>
                                                    {ACTION_LABELS[
                                                            selectedReport
                                                                .adminAction
                                                            ]
                                                        ?? "-"}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>처리 관리자</dt>
                                                <dd>
                                                    {selectedReport
                                                            .processedBy
                                                        ?? "-"}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>처리 시각</dt>
                                                <dd>
                                                    {formatDateTime(
                                                        selectedReport
                                                            .processedAt
                                                    )}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt>처리 내용</dt>
                                                <dd>
                                                    {selectedReport
                                                            .adminNote
                                                        ?? "-"}
                                                </dd>
                                            </div>
                                        </dl>
                                    </section>
                                ) : (
                                    <section className="report-processing">
                                        {selectedReport.status
                                            === "PENDING" && (
                                                <button
                                                    type="button"
                                                    className="report-review-button"
                                                    onClick={
                                                        handleStartReview
                                                    }
                                                    disabled={processing}
                                                >
                                                    검토 시작
                                                </button>
                                            )}

                                        <label>
                                            <span>관리자 조치</span>
                                            <select
                                                value={action}
                                                onChange={(event) =>
                                                    setAction(
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                disabled={processing}
                                            >
                                                <option value="NONE">
                                                    별도 조치 없음
                                                </option>

                                                <option value="CONTENT_DELETED">
                                                    콘텐츠 삭제
                                                </option>
                                            </select>
                                        </label>

                                        <label>
                                            <span>
                                                처리 내용 또는 기각 사유
                                            </span>
                                            <textarea
                                                value={adminNote}
                                                onChange={(event) =>
                                                    setAdminNote(
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                maxLength={1000}
                                                placeholder="처리 근거를 입력해 주세요."
                                                disabled={processing}
                                            />

                                            <small>
                                                {adminNote.length}
                                                /1000
                                            </small>
                                        </label>

                                        <div className="report-action-buttons">
                                            <button
                                                type="button"
                                                className="report-dismiss-button"
                                                onClick={handleDismiss}
                                                disabled={processing}
                                            >
                                                신고 기각
                                            </button>

                                            <button
                                                type="button"
                                                className="report-resolve-button"
                                                onClick={handleResolve}
                                                disabled={processing}
                                            >
                                                {processing
                                                    ? "처리 중..."
                                                    : "처리 완료"}
                                            </button>
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </article>
                </div>
            )}
        </section>
    );
}