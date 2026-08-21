import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axiosInstance from "../../../api/axiosInstance";
import "./AdminFacilitiesPage.css";

const PAGE_SIZE = 20;

const EMPTY_CREATE_FORM = {
    facilityType: "HOSPITAL",
    name: "",
    roadAddress: "",
    jibunAddress: "",
    telephone: "",
    latitude: "",
    longitude: "",
    businessNumber: "",
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

function getTypeLabel(type) {
    return type === "PHARMACY" ? "약국" : "병원";
}

function getStatusLabel(status) {
    const labels = {
        PENDING: "승인 대기",
        APPROVED: "승인",
        REJECTED: "거절",
    };

    return labels[status] ?? status;
}

export default function AdminFacilitiesPage() {
    const [facilities, setFacilities] = useState([]);

    const [keyword, setKeyword] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [type, setType] = useState("");
    const [status, setStatus] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const [selectedFacility, setSelectedFacility] =
        useState(null);

    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState("");

    const [createModalOpen, setCreateModalOpen] =
        useState(false);
    const [createForm, setCreateForm] = useState(
        EMPTY_CREATE_FORM
    );

    const loadFacilities = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                "/admin/facilities",
                {
                    params: {
                        page,
                        size: PAGE_SIZE,
                        sort: "createdAt,desc",
                        keyword:
                            searchKeyword.trim() || undefined,
                        type: type || undefined,
                        status: status || undefined,
                    },
                }
            );

            const data = response.data;

            setFacilities(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setTotalElements(data.totalElements ?? 0);
        } catch (error) {
            console.error("시설 목록 조회 실패:", error);

            setErrorMessage(
                error.response?.data?.message ??
                "병원·약국 목록을 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    }, [page, searchKeyword, type, status]);

    useEffect(() => {
        loadFacilities();
    }, [loadFacilities]);

    const replaceFacility = (updatedFacility) => {
        setFacilities((currentFacilities) =>
            currentFacilities.map((facility) =>
                facility.id === updatedFacility.id
                    ? updatedFacility
                    : facility
            )
        );

        setSelectedFacility((currentFacility) =>
            currentFacility?.id === updatedFacility.id
                ? updatedFacility
                : currentFacility
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
        setType("");
        setStatus("");
        setPage(0);
    };

    const handleOpenDetail = async (facilityId) => {
        try {
            setProcessingId(facilityId);
            setErrorMessage("");

            const response = await axiosInstance.get(
                `/admin/facilities/${facilityId}`
            );

            setSelectedFacility(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "시설 상세 정보를 불러오지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleApprove = async (facility) => {
        const confirmed = window.confirm(
            `${facility.name}을(를) 승인하시겠습니까?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingId(facility.id);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/facilities/${facility.id}/approve`
            );

            replaceFacility(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "시설을 승인하지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleOpenReject = (facility) => {
        setRejectTarget(facility);
        setRejectReason("");
    };

    const handleCloseReject = () => {
        setRejectTarget(null);
        setRejectReason("");
    };

    const handleReject = async (event) => {
        event.preventDefault();

        const reason = rejectReason.trim();

        if (!reason) {
            setErrorMessage("거절 사유를 입력해 주세요.");
            return;
        }

        if (reason.length > 500) {
            setErrorMessage(
                "거절 사유는 500자 이하로 입력해 주세요."
            );
            return;
        }

        try {
            setProcessingId(rejectTarget.id);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/facilities/${rejectTarget.id}/reject`,
                {
                    reason,
                }
            );

            replaceFacility(response.data);
            handleCloseReject();
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "시설 등록을 거절하지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    const handleCreateInput = (event) => {
        const { name, value } = event.target;

        setCreateForm((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const handleCloseCreate = () => {
        setCreateModalOpen(false);
        setCreateForm(EMPTY_CREATE_FORM);
    };

    const handleCreate = async (event) => {
        event.preventDefault();

        if (
            !createForm.name.trim() ||
            !createForm.roadAddress.trim()
        ) {
            setErrorMessage(
                "시설명과 도로명 주소를 입력해 주세요."
            );
            return;
        }

        if (
            createForm.latitude === "" ||
            createForm.longitude === ""
        ) {
            setErrorMessage("위도와 경도를 입력해 주세요.");
            return;
        }

        const latitude = Number(createForm.latitude);
        const longitude = Number(createForm.longitude);

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            setErrorMessage(
                "위도와 경도를 숫자로 입력해 주세요."
            );
            return;
        }

        try {
            setProcessingId("create");
            setErrorMessage("");

            await axiosInstance.post(
                "/admin/facilities",
                {
                    facilityType:
                    createForm.facilityType,
                    name: createForm.name.trim(),
                    roadAddress:
                        createForm.roadAddress.trim(),
                    jibunAddress:
                        createForm.jibunAddress.trim() ||
                        null,
                    telephone:
                        createForm.telephone.trim() ||
                        null,
                    latitude,
                    longitude,
                    businessNumber:
                        createForm.businessNumber.trim() ||
                        null,
                }
            );

            handleCloseCreate();
            setPage(0);
            await loadFacilities();
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "시설을 등록하지 못했습니다."
            );
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <section className="admin-facilities-page">
            <header className="admin-facilities-heading">
                <div>
                    <span>FACILITY MANAGEMENT</span>
                    <h1>병원·약국 관리</h1>
                    <p>
                        병원과 약국 정보를 등록하고 승인 상태를
                        관리합니다.
                    </p>
                </div>

                <div className="admin-facilities-heading-actions">
                    <div className="admin-facilities-count">
                        <span>조회된 시설</span>
                        <strong>
                            {totalElements.toLocaleString()}
                        </strong>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setCreateModalOpen(true)
                        }
                    >
                        + 시설 등록
                    </button>
                </div>
            </header>

            <form
                className="admin-facilities-filter"
                onSubmit={handleSearch}
            >
                <input
                    type="search"
                    value={keyword}
                    onChange={(event) =>
                        setKeyword(event.target.value)
                    }
                    placeholder="시설명, 주소 검색"
                />

                <select
                    value={type}
                    onChange={(event) => {
                        setType(event.target.value);
                        setPage(0);
                    }}
                >
                    <option value="">전체 유형</option>
                    <option value="HOSPITAL">병원</option>
                    <option value="PHARMACY">약국</option>
                </select>

                <select
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(0);
                    }}
                >
                    <option value="">전체 상태</option>
                    <option value="PENDING">
                        승인 대기
                    </option>
                    <option value="APPROVED">승인</option>
                    <option value="REJECTED">거절</option>
                </select>

                <button type="submit">검색</button>

                <button
                    type="button"
                    className="admin-facilities-reset"
                    onClick={handleResetFilters}
                >
                    초기화
                </button>
            </form>

            {errorMessage && (
                <div
                    className="admin-facilities-error"
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

            <div className="admin-facilities-table-card">
                {loading ? (
                    <div className="admin-facilities-state">
                        <div className="admin-facilities-spinner" />
                        <p>시설 목록을 불러오고 있습니다.</p>
                    </div>
                ) : facilities.length === 0 ? (
                    <div className="admin-facilities-state">
                        <strong>
                            조회된 병원·약국이 없습니다.
                        </strong>
                        <p>
                            검색 조건을 변경하거나 시설을
                            등록해 주세요.
                        </p>
                    </div>
                ) : (
                    <div className="admin-facilities-table-wrapper">
                        <table className="admin-facilities-table">
                            <thead>
                            <tr>
                                <th>시설</th>
                                <th>유형</th>
                                <th>주소</th>
                                <th>전화번호</th>
                                <th>승인 상태</th>
                                <th>등록일</th>
                                <th>관리</th>
                            </tr>
                            </thead>

                            <tbody>
                            {facilities.map(
                                (facility) => {
                                    const processing =
                                        processingId ===
                                        facility.id;

                                    return (
                                        <tr
                                            key={
                                                facility.id
                                            }
                                        >
                                            <td>
                                                <div className="admin-facility-name">
                                                        <span>
                                                            {facility.facilityType ===
                                                            "PHARMACY"
                                                                ? "P"
                                                                : "H"}
                                                        </span>

                                                    <div>
                                                        <strong>
                                                            {
                                                                facility.name
                                                            }
                                                        </strong>
                                                        <small>
                                                            ID{" "}
                                                            {
                                                                facility.id
                                                            }
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                    <span
                                                        className={`admin-facility-type admin-facility-type--${facility.facilityType?.toLowerCase()}`}
                                                    >
                                                        {getTypeLabel(
                                                            facility.facilityType
                                                        )}
                                                    </span>
                                            </td>

                                            <td className="admin-facility-address">
                                                {
                                                    facility.roadAddress
                                                }
                                            </td>

                                            <td>
                                                {facility.telephone ||
                                                    "-"}
                                            </td>

                                            <td>
                                                    <span
                                                        className={`admin-facility-status admin-facility-status--${facility.approvalStatus?.toLowerCase()}`}
                                                    >
                                                        {getStatusLabel(
                                                            facility.approvalStatus
                                                        )}
                                                    </span>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    facility.createdAt
                                                )}
                                            </td>

                                            <td>
                                                <div className="admin-facility-actions">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            processing
                                                        }
                                                        onClick={() =>
                                                            handleOpenDetail(
                                                                facility.id
                                                            )
                                                        }
                                                    >
                                                        상세
                                                    </button>

                                                    {facility.approvalStatus !==
                                                        "APPROVED" && (
                                                            <button
                                                                type="button"
                                                                className="approve"
                                                                disabled={
                                                                    processing
                                                                }
                                                                onClick={() =>
                                                                    handleApprove(
                                                                        facility
                                                                    )
                                                                }
                                                            >
                                                                승인
                                                            </button>
                                                        )}

                                                    {facility.approvalStatus !==
                                                        "REJECTED" && (
                                                            <button
                                                                type="button"
                                                                className="reject"
                                                                disabled={
                                                                    processing
                                                                }
                                                                onClick={() =>
                                                                    handleOpenReject(
                                                                        facility
                                                                    )
                                                                }
                                                            >
                                                                거절
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }
                            )}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && totalPages > 1 && (
                    <div className="admin-facilities-pagination">
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

            {selectedFacility && (
                <div
                    className="admin-facility-modal-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setSelectedFacility(null);
                        }
                    }}
                >
                    <section className="admin-facility-modal">
                        <header>
                            <div>
                                <span>FACILITY DETAIL</span>
                                <h2>시설 상세 정보</h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedFacility(null)
                                }
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-facility-detail-title">
                            <span>
                                {getTypeLabel(
                                    selectedFacility.facilityType
                                )}
                            </span>
                            <h3>{selectedFacility.name}</h3>
                            <p>
                                {
                                    selectedFacility.roadAddress
                                }
                            </p>
                        </div>

                        <dl className="admin-facility-detail-list">
                            <div>
                                <dt>시설 번호</dt>
                                <dd>
                                    {selectedFacility.id}
                                </dd>
                            </div>

                            <div>
                                <dt>승인 상태</dt>
                                <dd>
                                    {getStatusLabel(
                                        selectedFacility.approvalStatus
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt>지번 주소</dt>
                                <dd>
                                    {selectedFacility.jibunAddress ||
                                        "-"}
                                </dd>
                            </div>

                            <div>
                                <dt>전화번호</dt>
                                <dd>
                                    {selectedFacility.telephone ||
                                        "-"}
                                </dd>
                            </div>

                            <div>
                                <dt>위도</dt>
                                <dd>
                                    {selectedFacility.latitude}
                                </dd>
                            </div>

                            <div>
                                <dt>경도</dt>
                                <dd>
                                    {selectedFacility.longitude}
                                </dd>
                            </div>

                            <div>
                                <dt>사업자 번호</dt>
                                <dd>
                                    {selectedFacility.businessNumber ||
                                        "-"}
                                </dd>
                            </div>

                            <div>
                                <dt>등록일</dt>
                                <dd>
                                    {formatDate(
                                        selectedFacility.createdAt
                                    )}
                                </dd>
                            </div>
                        </dl>

                        {selectedFacility.rejectionReason && (
                            <div className="admin-facility-rejection-info">
                                <strong>거절 사유</strong>
                                <p>
                                    {
                                        selectedFacility.rejectionReason
                                    }
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {rejectTarget && (
                <div className="admin-facility-modal-backdrop">
                    <form
                        className="admin-facility-modal"
                        onSubmit={handleReject}
                    >
                        <header>
                            <div>
                                <span>REJECT FACILITY</span>
                                <h2>시설 등록 거절</h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseReject}
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-facility-form">
                            <p>
                                <strong>
                                    {rejectTarget.name}
                                </strong>
                                의 등록을 거절합니다.
                            </p>

                            <label>
                                <span>거절 사유 *</span>

                                <textarea
                                    value={rejectReason}
                                    maxLength={500}
                                    autoFocus
                                    placeholder="거절 사유를 입력해 주세요."
                                    onChange={(event) =>
                                        setRejectReason(
                                            event.target.value
                                        )
                                    }
                                />

                                <small>
                                    {rejectReason.length} / 500
                                </small>
                            </label>
                        </div>

                        <div className="admin-facility-modal-actions">
                            <button
                                type="button"
                                onClick={handleCloseReject}
                            >
                                취소
                            </button>

                            <button
                                type="submit"
                                className="danger"
                                disabled={
                                    processingId ===
                                    rejectTarget.id
                                }
                            >
                                거절 처리
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {createModalOpen && (
                <div className="admin-facility-modal-backdrop">
                    <form
                        className="admin-facility-modal admin-facility-create-modal"
                        onSubmit={handleCreate}
                    >
                        <header>
                            <div>
                                <span>CREATE FACILITY</span>
                                <h2>병원·약국 등록</h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseCreate}
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-facility-create-grid">
                            <label>
                                <span>시설 유형 *</span>
                                <select
                                    name="facilityType"
                                    value={
                                        createForm.facilityType
                                    }
                                    onChange={handleCreateInput}
                                >
                                    <option value="HOSPITAL">
                                        병원
                                    </option>
                                    <option value="PHARMACY">
                                        약국
                                    </option>
                                </select>
                            </label>

                            <label>
                                <span>시설명 *</span>
                                <input
                                    name="name"
                                    value={createForm.name}
                                    onChange={handleCreateInput}
                                    maxLength={200}
                                />
                            </label>

                            <label className="wide">
                                <span>도로명 주소 *</span>
                                <input
                                    name="roadAddress"
                                    value={
                                        createForm.roadAddress
                                    }
                                    onChange={handleCreateInput}
                                    maxLength={500}
                                />
                            </label>

                            <label className="wide">
                                <span>지번 주소</span>
                                <input
                                    name="jibunAddress"
                                    value={
                                        createForm.jibunAddress
                                    }
                                    onChange={handleCreateInput}
                                    maxLength={500}
                                />
                            </label>

                            <label>
                                <span>전화번호</span>
                                <input
                                    name="telephone"
                                    value={
                                        createForm.telephone
                                    }
                                    onChange={handleCreateInput}
                                    maxLength={30}
                                />
                            </label>

                            <label>
                                <span>사업자 번호</span>
                                <input
                                    name="businessNumber"
                                    value={
                                        createForm.businessNumber
                                    }
                                    onChange={handleCreateInput}
                                    maxLength={30}
                                />
                            </label>

                            <label>
                                <span>위도 *</span>
                                <input
                                    name="latitude"
                                    type="number"
                                    step="any"
                                    value={
                                        createForm.latitude
                                    }
                                    onChange={handleCreateInput}
                                    placeholder="37.5665"
                                />
                            </label>

                            <label>
                                <span>경도 *</span>
                                <input
                                    name="longitude"
                                    type="number"
                                    step="any"
                                    value={
                                        createForm.longitude
                                    }
                                    onChange={handleCreateInput}
                                    placeholder="126.9780"
                                />
                            </label>
                        </div>

                        <div className="admin-facility-modal-actions">
                            <button
                                type="button"
                                onClick={handleCloseCreate}
                            >
                                취소
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    processingId === "create"
                                }
                            >
                                {processingId === "create"
                                    ? "등록 중..."
                                    : "시설 등록"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}