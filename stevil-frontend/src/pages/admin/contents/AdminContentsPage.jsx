
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axiosInstance from "../../../api/axiosInstance";
import "./AdminContentsPage.css";

const PAGE_SIZE = 20;

const CATEGORY_LABELS = {
    GLP1: "GLP-1",
    DIET: "식단",
    EXERCISE: "운동",
    WEIGHT: "체중",
    SIDE_EFFECT: "부작용",
    MEDICAL: "의학 정보",
    ETC: "기타",
};

const STATUS_LABELS = {
    DRAFT: "임시 저장",
    PUBLISHED: "공개",
    HIDDEN: "숨김",
};

const EMPTY_FORM = {
    category: "GLP1",
    title: "",
    summary: "",
    content: "",
    thumbnailUrl: "",
    sourceUrl: "",
    status: "DRAFT",
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

function createFormFromContent(content) {
    return {
        category: content.category ?? "GLP1",
        title: content.title ?? "",
        summary: content.summary ?? "",
        content: content.content ?? "",
        thumbnailUrl: content.thumbnailUrl ?? "",
        sourceUrl: content.sourceUrl ?? "",
        status: content.status ?? "DRAFT",
    };
}

export default function AdminContentsPage() {
    const [contents, setContents] = useState([]);

    const [keyword, setKeyword] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [category, setCategory] = useState("");
    const [status, setStatus] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingContent, setEditingContent] =
        useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    const [detailContent, setDetailContent] =
        useState(null);

    const loadContents = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                "/admin/contents",
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

            setContents(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setTotalElements(data.totalElements ?? 0);
        } catch (error) {
            console.error("콘텐츠 목록 조회 실패:", error);

            setErrorMessage(
                error.response?.data?.message ??
                "건강 콘텐츠 목록을 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    }, [page, searchKeyword, category, status]);

    useEffect(() => {
        loadContents();
    }, [loadContents]);

    const replaceContent = (updatedContent) => {
        setContents((current) =>
            current.map((content) =>
                content.id === updatedContent.id
                    ? updatedContent
                    : content
            )
        );

        setDetailContent((current) =>
            current?.id === updatedContent.id
                ? updatedContent
                : current
        );
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

    const handleOpenCreate = () => {
        setEditingContent(null);
        setForm(EMPTY_FORM);
        setEditorOpen(true);
        setErrorMessage("");
    };

    const handleOpenEdit = (content) => {
        setEditingContent(content);
        setForm(createFormFromContent(content));
        setDetailContent(null);
        setEditorOpen(true);
        setErrorMessage("");
    };

    const handleCloseEditor = () => {
        if (processingId) {
            return;
        }

        setEditorOpen(false);
        setEditingContent(null);
        setForm(EMPTY_FORM);
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!form.title.trim()) {
            return "콘텐츠 제목을 입력해 주세요.";
        }

        if (!form.content.trim()) {
            return "콘텐츠 내용을 입력해 주세요.";
        }

        if (form.title.trim().length > 200) {
            return "제목은 200자 이하로 입력해 주세요.";
        }

        if (form.summary.trim().length > 500) {
            return "요약은 500자 이하로 입력해 주세요.";
        }

        return "";
    };

    const handleSave = async (event) => {
        event.preventDefault();

        const validationMessage = validateForm();

        if (validationMessage) {
            setErrorMessage(validationMessage);
            return;
        }

        const payload = {
            category: form.category,
            title: form.title.trim(),
            summary: form.summary.trim() || null,
            content: form.content.trim(),
            thumbnailUrl:
                form.thumbnailUrl.trim() || null,
            sourceUrl: form.sourceUrl.trim() || null,
        };

        try {
            setProcessingId(
                editingContent?.id ?? "create"
            );
            setErrorMessage("");

            if (editingContent) {
                const response = await axiosInstance.put(
                    `/admin/contents/${editingContent.id}`,
                    payload
                );

                replaceContent(response.data);

                if (
                    form.status !== response.data.status
                ) {
                    const statusResponse =
                        await axiosInstance.patch(
                            `/admin/contents/${editingContent.id}/status`,
                            {
                                status: form.status,
                            }
                        );

                    replaceContent(statusResponse.data);
                }
            } else {
                await axiosInstance.post(
                    "/admin/contents",
                    {
                        ...payload,
                        status: form.status,
                    }
                );
            }

            setEditorOpen(false);
            setEditingContent(null);
            setForm(EMPTY_FORM);

            if (page !== 0) {
                setPage(0);
            } else {
                await loadContents();
            }
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "콘텐츠를 저장하지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenDetail = async (contentId) => {
        try {
            setProcessingId(contentId);
            setErrorMessage("");

            const response = await axiosInstance.get(
                `/admin/contents/${contentId}`
            );

            setDetailContent(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "콘텐츠 상세 정보를 불러오지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleStatusChange = async (
        content,
        nextStatus
    ) => {
        if (content.status === nextStatus) {
            return;
        }

        const confirmed = window.confirm(
            `"${content.title}" 콘텐츠를 ` +
            `${STATUS_LABELS[nextStatus]} 상태로 변경하시겠습니까?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingId(content.id);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/contents/${content.id}/status`,
                {
                    status: nextStatus,
                }
            );

            replaceContent(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "콘텐츠 공개 상태를 변경하지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (content) => {
        const confirmed = window.confirm(
            `"${content.title}" 콘텐츠를 삭제하시겠습니까?\n` +
            "삭제한 콘텐츠는 복구할 수 없습니다."
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingId(content.id);
            setErrorMessage("");

            await axiosInstance.delete(
                `/admin/contents/${content.id}`
            );

            setDetailContent(null);

            if (contents.length === 1 && page > 0) {
                setPage((current) => current - 1);
            } else {
                await loadContents();
            }
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "콘텐츠를 삭제하지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <section className="admin-contents-page">
            <header className="admin-contents-heading">
                <div>
                    <span>CONTENT MANAGEMENT</span>
                    <h1>건강 콘텐츠 관리</h1>
                    <p>
                        사용자에게 제공할 건강 정보를 작성하고
                        공개 상태를 관리합니다.
                    </p>
                </div>

                <div className="admin-contents-heading-actions">
                    <div className="admin-contents-count">
                        <span>전체 콘텐츠</span>
                        <strong>
                            {totalElements.toLocaleString()}
                        </strong>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                    >
                        + 콘텐츠 작성
                    </button>
                </div>
            </header>

            <form
                className="admin-contents-filter"
                onSubmit={handleSearch}
            >
                <input
                    type="search"
                    value={keyword}
                    onChange={(event) =>
                        setKeyword(event.target.value)
                    }
                    placeholder="제목 또는 요약 검색"
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
                    className="admin-contents-reset"
                    onClick={handleResetFilters}
                >
                    초기화
                </button>
            </form>

            {errorMessage && (
                <div
                    className="admin-contents-error"
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

            <div className="admin-contents-table-card">
                {loading ? (
                    <div className="admin-contents-state">
                        <div className="admin-contents-spinner" />
                        <p>
                            콘텐츠 목록을 불러오고 있습니다.
                        </p>
                    </div>
                ) : contents.length === 0 ? (
                    <div className="admin-contents-state">
                        <strong>
                            등록된 콘텐츠가 없습니다.
                        </strong>
                        <p>
                            새로운 건강 콘텐츠를 작성해 주세요.
                        </p>
                    </div>
                ) : (
                    <div className="admin-contents-table-wrapper">
                        <table className="admin-contents-table">
                            <thead>
                            <tr>
                                <th>콘텐츠</th>
                                <th>분류</th>
                                <th>상태</th>
                                <th>작성자</th>
                                <th>등록일</th>
                                <th>관리</th>
                            </tr>
                            </thead>

                            <tbody>
                            {contents.map((content) => {
                                const isProcessing =
                                    processingId ===
                                    content.id;

                                return (
                                    <tr key={content.id}>
                                        <td>
                                            <div className="admin-content-title">
                                                {content.thumbnailUrl ? (
                                                    <img
                                                        src={
                                                            content.thumbnailUrl
                                                        }
                                                        alt=""
                                                    />
                                                ) : (
                                                    <span className="admin-content-thumbnail-placeholder">
                                                            C
                                                        </span>
                                                )}

                                                <div>
                                                    <strong>
                                                        {
                                                            content.title
                                                        }
                                                    </strong>

                                                    <small>
                                                        {content.summary ||
                                                            "요약 없음"}
                                                    </small>

                                                    <em>
                                                        ID{" "}
                                                        {
                                                            content.id
                                                        }
                                                    </em>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                                <span className="admin-content-category">
                                                    {CATEGORY_LABELS[
                                                            content
                                                                .category
                                                            ] ??
                                                        content.category}
                                                </span>
                                        </td>

                                        <td>
                                            <select
                                                className={`admin-content-status-select admin-content-status-select--${content.status?.toLowerCase()}`}
                                                value={
                                                    content.status
                                                }
                                                disabled={
                                                    isProcessing
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleStatusChange(
                                                        content,
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                {Object.entries(
                                                    STATUS_LABELS
                                                ).map(
                                                    ([
                                                         value,
                                                         label,
                                                     ]) => (
                                                        <option
                                                            key={
                                                                value
                                                            }
                                                            value={
                                                                value
                                                            }
                                                        >
                                                            {
                                                                label
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </td>

                                        <td>
                                            관리자 ID{" "}
                                            {content.authorId}
                                        </td>

                                        <td>
                                            {formatDate(
                                                content.createdAt
                                            )}
                                        </td>

                                        <td>
                                            <div className="admin-content-actions">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        isProcessing
                                                    }
                                                    onClick={() =>
                                                        handleOpenDetail(
                                                            content.id
                                                        )
                                                    }
                                                >
                                                    상세
                                                </button>

                                                <button
                                                    type="button"
                                                    className="edit"
                                                    disabled={
                                                        isProcessing
                                                    }
                                                    onClick={() =>
                                                        handleOpenEdit(
                                                            content
                                                        )
                                                    }
                                                >
                                                    수정
                                                </button>

                                                <button
                                                    type="button"
                                                    className="delete"
                                                    disabled={
                                                        isProcessing
                                                    }
                                                    onClick={() =>
                                                        handleDelete(
                                                            content
                                                        )
                                                    }
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="admin-contents-pagination">
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

            {editorOpen && (
                <div
                    className="admin-content-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            handleCloseEditor();
                        }
                    }}
                >
                    <form
                        className="admin-content-modal admin-content-editor"
                        onSubmit={handleSave}
                    >
                        <header>
                            <div>
                                <span>
                                    {editingContent
                                        ? "EDIT CONTENT"
                                        : "CREATE CONTENT"}
                                </span>

                                <h2>
                                    {editingContent
                                        ? "건강 콘텐츠 수정"
                                        : "건강 콘텐츠 작성"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseEditor}
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-content-form-grid">
                            <label>
                                <span>카테고리 *</span>

                                <select
                                    name="category"
                                    value={form.category}
                                    onChange={handleFormChange}
                                >
                                    {Object.entries(
                                        CATEGORY_LABELS
                                    ).map(
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
                            </label>

                            <label>
                                <span>공개 상태 *</span>

                                <select
                                    name="status"
                                    value={form.status}
                                    onChange={handleFormChange}
                                >
                                    {Object.entries(
                                        STATUS_LABELS
                                    ).map(
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
                            </label>

                            <label className="wide">
                                <span>제목 *</span>

                                <input
                                    name="title"
                                    value={form.title}
                                    maxLength={200}
                                    onChange={handleFormChange}
                                    placeholder="콘텐츠 제목"
                                />

                                <small>
                                    {form.title.length} / 200
                                </small>
                            </label>

                            <label className="wide">
                                <span>내용 요약</span>

                                <textarea
                                    name="summary"
                                    className="summary"
                                    value={form.summary}
                                    maxLength={500}
                                    onChange={handleFormChange}
                                    placeholder="목록에 표시할 짧은 설명"
                                />

                                <small>
                                    {form.summary.length} / 500
                                </small>
                            </label>

                            <label className="wide">
                                <span>본문 *</span>

                                <textarea
                                    name="content"
                                    className="body"
                                    value={form.content}
                                    onChange={handleFormChange}
                                    placeholder="건강 정보 본문을 입력해 주세요."
                                />
                            </label>

                            <label>
                                <span>썸네일 URL</span>

                                <input
                                    name="thumbnailUrl"
                                    value={form.thumbnailUrl}
                                    maxLength={500}
                                    onChange={handleFormChange}
                                    placeholder="https://..."
                                />
                            </label>

                            <label>
                                <span>출처 URL</span>

                                <input
                                    name="sourceUrl"
                                    value={form.sourceUrl}
                                    maxLength={500}
                                    onChange={handleFormChange}
                                    placeholder="논문 또는 공식 자료 주소"
                                />
                            </label>
                        </div>

                        <div className="admin-content-modal-actions">
                            <button
                                type="button"
                                onClick={handleCloseEditor}
                            >
                                취소
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    processingId === "create" ||
                                    processingId ===
                                    editingContent?.id
                                }
                            >
                                {processingId
                                    ? "저장 중..."
                                    : editingContent
                                        ? "수정 저장"
                                        : "콘텐츠 등록"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {detailContent && (
                <div
                    className="admin-content-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setDetailContent(null);
                        }
                    }}
                >
                    <article className="admin-content-modal admin-content-detail">
                        <header>
                            <div>
                                <span>CONTENT DETAIL</span>
                                <h2>콘텐츠 상세</h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setDetailContent(null)
                                }
                            >
                                ×
                            </button>
                        </header>

                        {detailContent.thumbnailUrl && (
                            <img
                                className="admin-content-detail-image"
                                src={detailContent.thumbnailUrl}
                                alt=""
                            />
                        )}

                        <div className="admin-content-detail-body">
                            <div className="admin-content-detail-badges">
                                <span>
                                    {
                                        CATEGORY_LABELS[
                                            detailContent
                                                .category
                                            ]
                                    }
                                </span>

                                <span
                                    className={`status status--${detailContent.status?.toLowerCase()}`}
                                >
                                    {
                                        STATUS_LABELS[
                                            detailContent.status
                                            ]
                                    }
                                </span>
                            </div>

                            <h3>{detailContent.title}</h3>

                            {detailContent.summary && (
                                <p className="summary">
                                    {detailContent.summary}
                                </p>
                            )}

                            <div className="content">
                                {detailContent.content}
                            </div>

                            {detailContent.sourceUrl && (
                                <a
                                    href={
                                        detailContent.sourceUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    원문 출처 확인
                                </a>
                            )}

                            <dl>
                                <div>
                                    <dt>작성자</dt>
                                    <dd>
                                        관리자 ID{" "}
                                        {detailContent.authorId}
                                    </dd>
                                </div>

                                <div>
                                    <dt>작성일</dt>
                                    <dd>
                                        {formatDate(
                                            detailContent.createdAt
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt>공개일</dt>
                                    <dd>
                                        {formatDate(
                                            detailContent.publishedAt
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>

                        <div className="admin-content-modal-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    handleDelete(
                                        detailContent
                                    )
                                }
                            >
                                삭제
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleOpenEdit(
                                        detailContent
                                    )
                                }
                            >
                                수정
                            </button>
                        </div>
                    </article>
                </div>
            )}
        </section>
    );
}