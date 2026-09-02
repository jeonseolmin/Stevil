import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axiosInstance from "../../../api/axiosInstance";
import "./AdminPartnershipInquiriesPage.css";

const PAGE_SIZE = 20;

const STATUS_LABELS = {
    PENDING: "접수",
    REVIEWING: "검토 중",
    APPROVED: "승인",
    REJECTED: "거절",
};

const FACILITY_LABELS = {
    HOSPITAL: "병원",
    PHARMACY: "약국",
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

export default function AdminPartnershipInquiriesPage() {
    const [inquiries, setInquiries] = useState([]);

    const [keyword, setKeyword] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [status, setStatus] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [selectedInquiry, setSelectedInquiry] =
        useState(null);

    const [rejectionReason, setRejectionReason] =
        useState("");

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] =
        useState("");

    const loadInquiries = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                "/admin/partnership-inquiries",
                {
                    params: {
                        page,
                        size: PAGE_SIZE,
                        sort: "createdAt,desc",
                        keyword:
                            searchKeyword.trim() ||
                            undefined,
                        status: status || undefined,
                    },
                }
            );

            const data = response.data;

            setInquiries(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setTotalElements(
                data.totalElements ?? 0
            );
        } catch (error) {
            console.error(
                "제휴 문의 목록 조회 실패:",
                error
            );

            setErrorMessage(
                error.response?.data?.message ??
                "제휴 문의 목록을 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    }, [page, searchKeyword, status]);

    useEffect(() => {
        loadInquiries();
    }, [loadInquiries]);

    const handleSearch = (event) => {
        event.preventDefault();

        setPage(0);
        setSearchKeyword(keyword);
    };

    const handleReset = () => {
        setKeyword("");
        setSearchKeyword("");
        setStatus("");
        setPage(0);
    };

    const handleOpenDetail = async (id) => {
        try {
            setProcessing(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                `/admin/partnership-inquiries/${id}`
            );

            setSelectedInquiry(response.data);
            setRejectionReason(
                response.data.rejectionReason ?? ""
            );
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "제휴 문의 상세 정보를 불러오지 못했습니다."
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleCloseDetail = () => {
        setSelectedInquiry(null);
        setRejectionReason("");
    };

    const replaceInquiry = (updated) => {
        setInquiries((current) =>
            current.map((item) =>
                item.id === updated.id
                    ? updated
                    : item
            )
        );

        setSelectedInquiry(updated);
    };

    const changeStatus = async (
        nextStatus,
        reason = null
    ) => {
        if (!selectedInquiry) {
            return;
        }

        try {
            setProcessing(true);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/partnership-inquiries/${selectedInquiry.id}/status`,
                {
                    status: nextStatus,
                    rejectionReason: reason,
                }
            );

            replaceInquiry(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "제휴 문의 상태를 변경하지 못했습니다."
            );
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = rejectionReason.trim();

        if (!reason) {
            setErrorMessage(
                "거절 사유를 입력해 주세요."
            );
            return;
        }

        await changeStatus("REJECTED", reason);
    };

    return (
        <section className="admin-partnership-page">
            <header className="admin-partnership-heading">
                <div>
                    <span>
                        PARTNERSHIP MANAGEMENT
                    </span>

                    <h1>제휴 문의 관리</h1>

                    <p>
                        병원·약국에서 접수한 제휴
                        신청을 검토하고 처리합니다.
                    </p>
                </div>

                <div className="admin-partnership-count">
                    <span>조회된 문의</span>
                    <strong>
                        {totalElements.toLocaleString()}
                    </strong>
                </div>
            </header>

            <form
                className="admin-partnership-filter"
                onSubmit={handleSearch}
            >
                <input
                    type="search"
                    value={keyword}
                    placeholder="시설명 검색"
                    onChange={(event) =>
                        setKeyword(
                            event.target.value
                        )
                    }
                />

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(
                            event.target.value
                        );
                        setPage(0);
                    }}
                >
                    <option value="">
                        전체 상태
                    </option>

                    {Object.entries(
                        STATUS_LABELS
                    ).map(([value, label]) => (
                        <option
                            key={value}
                            value={value}
                        >
                            {label}
                        </option>
                    ))}
                </select>

                <button type="submit">
                    검색
                </button>

                <button
                    type="button"
                    onClick={handleReset}
                >
                    초기화
                </button>
            </form>

            {errorMessage && (
                <div className="admin-partnership-error">
                    {errorMessage}
                </div>
            )}

            <div className="admin-partnership-table-card">
                {loading ? (
                    <div className="admin-partnership-state">
                        제휴 문의를 불러오고
                        있습니다.
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="admin-partnership-state">
                        등록된 제휴 문의가 없습니다.
                    </div>
                ) : (
                    <div className="admin-partnership-table-wrapper">
                        <table className="admin-partnership-table">
                            <thead>
                            <tr>
                                <th>번호</th>
                                <th>유형</th>
                                <th>시설명</th>
                                <th>담당자</th>
                                <th>연락처</th>
                                <th>상태</th>
                                <th>접수일</th>
                                <th>관리</th>
                            </tr>
                            </thead>

                            <tbody>
                            {inquiries.map(
                                (inquiry) => (
                                    <tr
                                        key={
                                            inquiry.id
                                        }
                                    >
                                        <td>
                                            #
                                            {
                                                inquiry.id
                                            }
                                        </td>

                                        <td>
                                            {
                                                FACILITY_LABELS[
                                                    inquiry
                                                        .facilityType
                                                    ] ??
                                                inquiry.facilityType
                                            }
                                        </td>

                                        <td>
                                            <strong>
                                                {
                                                    inquiry.facilityName
                                                }
                                            </strong>
                                        </td>

                                        <td>
                                            {
                                                inquiry.managerName
                                            }
                                        </td>

                                        <td>
                                            {
                                                inquiry.phone
                                            }
                                        </td>

                                        <td>
                                            <span
                                                className={`partnership-status partnership-status--${inquiry.status?.toLowerCase()}`}
                                            >
                                                {
                                                    STATUS_LABELS[
                                                        inquiry
                                                            .status
                                                        ] ??
                                                    inquiry.status
                                                }
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
                                                onClick={() =>
                                                    handleOpenDetail(
                                                        inquiry.id
                                                    )
                                                }
                                            >
                                                상세
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading &&
                    totalPages > 1 && (
                        <div className="admin-partnership-pagination">
                            <button
                                type="button"
                                disabled={
                                    page === 0
                                }
                                onClick={() =>
                                    setPage(
                                        (
                                            current
                                        ) =>
                                            Math.max(
                                                current -
                                                1,
                                                0
                                            )
                                    )
                                }
                            >
                                이전
                            </button>

                            <span>
                                {page + 1} /{" "}
                                {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={
                                    page + 1 >=
                                    totalPages
                                }
                                onClick={() =>
                                    setPage(
                                        (
                                            current
                                        ) =>
                                            current +
                                            1
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
                    className="admin-partnership-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            handleCloseDetail();
                        }
                    }}
                >
                    <section className="admin-partnership-modal">
                        <header>
                            <div>
                                <span>
                                    PARTNERSHIP DETAIL
                                </span>
                                <h2>
                                    제휴 문의 상세
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    handleCloseDetail
                                }
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-partnership-detail-grid">
                            <div>
                                <span>시설 유형</span>
                                <strong>
                                    {
                                        FACILITY_LABELS[
                                            selectedInquiry
                                                .facilityType
                                            ]
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>시설명</span>
                                <strong>
                                    {
                                        selectedInquiry.facilityName
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>담당자</span>
                                <strong>
                                    {
                                        selectedInquiry.managerName
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>연락처</span>
                                <strong>
                                    {
                                        selectedInquiry.phone
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>이메일</span>
                                <strong>
                                    {
                                        selectedInquiry.email
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>상태</span>
                                <strong>
                                    {
                                        STATUS_LABELS[
                                            selectedInquiry
                                                .status
                                            ]
                                    }
                                </strong>
                            </div>
                        </div>

                        <article className="admin-partnership-detail-block">
                            <strong>주소</strong>
                            <p>
                                {
                                    selectedInquiry.address
                                }
                            </p>
                        </article>

                        <article className="admin-partnership-detail-block">
                            <strong>
                                문의 내용
                            </strong>

                            <p>
                                {selectedInquiry.message ||
                                    "별도 문의 내용이 없습니다."}
                            </p>
                        </article>

                        {selectedInquiry.status !==
                            "APPROVED" && (
                                <div className="admin-partnership-actions">
                                    {selectedInquiry.status ===
                                        "PENDING" && (
                                            <button
                                                type="button"
                                                disabled={
                                                    processing
                                                }
                                                onClick={() =>
                                                    changeStatus(
                                                        "REVIEWING"
                                                    )
                                                }
                                            >
                                                검토 시작
                                            </button>
                                        )}

                                    <button
                                        type="button"
                                        disabled={
                                            processing
                                        }
                                        onClick={() =>
                                            changeStatus(
                                                "APPROVED"
                                            )
                                        }
                                    >
                                        승인
                                    </button>
                                </div>
                            )}

                        {selectedInquiry.status !==
                            "APPROVED" && (
                                <div className="admin-partnership-reject">
                                    <label
                                        htmlFor="rejectionReason"
                                    >
                                        거절 사유
                                    </label>

                                    <textarea
                                        id="rejectionReason"
                                        maxLength={500}
                                        value={
                                            rejectionReason
                                        }
                                        placeholder="거절 사유를 입력해 주세요."
                                        onChange={(
                                            event
                                        ) =>
                                            setRejectionReason(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                    <button
                                        type="button"
                                        disabled={
                                            processing
                                        }
                                        onClick={
                                            handleReject
                                        }
                                    >
                                        거절 처리
                                    </button>
                                </div>
                            )}
                    </section>
                </div>
            )}
        </section>
    );
}