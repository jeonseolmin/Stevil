
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axiosInstance from "../../../api/axiosInstance";
import "./AdminUsersPage.css";

const PAGE_SIZE = 20;

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

function getRoleLabel(role) {
    const labels = {
        ROLE_USER: "일반 회원",
        ROLE_DOCTOR: "의료진",
        ROLE_ADMIN: "관리자",
    };

    return labels[role] ?? role;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [loading, setLoading] = useState(true);
    const [processingUserId, setProcessingUserId] =
        useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    const [selectedUser, setSelectedUser] = useState(null);

    const [suspensionTarget, setSuspensionTarget] =
        useState(null);
    const [suspensionReason, setSuspensionReason] =
        useState("");

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMessage("");

            const response = await axiosInstance.get(
                "/admin/users",
                {
                    params: {
                        page,
                        size: PAGE_SIZE,
                        sort: "createdAt,desc",
                        keyword:
                            searchKeyword.trim() || undefined,
                    },
                }
            );

            const data = response.data;

            setUsers(data.content ?? []);
            setTotalPages(data.totalPages ?? 0);
            setTotalElements(data.totalElements ?? 0);
        } catch (error) {
            console.error("관리자 회원 조회 실패:", error);

            setErrorMessage(
                error.response?.data?.message ??
                "회원 목록을 불러오지 못했습니다."
            );
        } finally {
            setLoading(false);
        }
    }, [page, searchKeyword]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSearch = (event) => {
        event.preventDefault();

        setPage(0);
        setSearchKeyword(keyword);
    };

    const handleResetSearch = () => {
        setKeyword("");
        setSearchKeyword("");
        setPage(0);
    };

    const handleOpenDetail = async (userId) => {
        try {
            setProcessingUserId(userId);
            setErrorMessage("");

            const response = await axiosInstance.get(
                `/admin/users/${userId}`
            );

            setSelectedUser(response.data);
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "회원 상세 정보를 불러오지 못했습니다."
            );
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleRoleChange = async (user, nextRole) => {
        if (user.role === nextRole) {
            return;
        }

        const confirmed = window.confirm(
            `${user.email} 회원의 권한을 ` +
            `${getRoleLabel(nextRole)}로 변경하시겠습니까?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingUserId(user.id);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/users/${user.id}/role`,
                {
                    role: nextRole,
                }
            );

            const updatedUser = response.data;

            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser.id === updatedUser.id
                        ? updatedUser
                        : currentUser
                )
            );

            setSelectedUser((currentUser) =>
                currentUser?.id === updatedUser.id
                    ? updatedUser
                    : currentUser
            );
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "회원 권한을 변경하지 못했습니다."
            );
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleOpenSuspension = (user) => {
        setSuspensionTarget(user);
        setSuspensionReason("");
    };

    const handleCloseSuspension = () => {
        setSuspensionTarget(null);
        setSuspensionReason("");
    };

    const handleSuspendUser = async (event) => {
        event.preventDefault();

        const reason = suspensionReason.trim();

        if (!reason) {
            setErrorMessage("회원 정지 사유를 입력해 주세요.");
            return;
        }

        if (reason.length > 500) {
            setErrorMessage(
                "회원 정지 사유는 500자 이하로 입력해 주세요."
            );
            return;
        }

        try {
            setProcessingUserId(suspensionTarget.id);
            setErrorMessage("");

            const response = await axiosInstance.patch(
                `/admin/users/${suspensionTarget.id}/suspension`,
                {
                    reason,
                }
            );

            const updatedUser = response.data;

            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser.id === updatedUser.id
                        ? updatedUser
                        : currentUser
                )
            );

            setSelectedUser((currentUser) =>
                currentUser?.id === updatedUser.id
                    ? updatedUser
                    : currentUser
            );

            handleCloseSuspension();
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "회원을 정지하지 못했습니다."
            );
        } finally {
            setProcessingUserId(null);
        }
    };

    const handleReleaseSuspension = async (user) => {
        const confirmed = window.confirm(
            `${user.email} 회원의 정지를 해제하시겠습니까?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setProcessingUserId(user.id);
            setErrorMessage("");

            const response = await axiosInstance.delete(
                `/admin/users/${user.id}/suspension`
            );

            const updatedUser = response.data;

            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser.id === updatedUser.id
                        ? updatedUser
                        : currentUser
                )
            );

            setSelectedUser((currentUser) =>
                currentUser?.id === updatedUser.id
                    ? updatedUser
                    : currentUser
            );
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ??
                "회원 정지를 해제하지 못했습니다."
            );
        } finally {
            setProcessingUserId(null);
        }
    };

    return (
        <section className="admin-users-page">
            <header className="admin-users-heading">
                <div>
                    <span>USER MANAGEMENT</span>

                    <h1>회원 관리</h1>

                    <p>
                        가입 회원을 조회하고 권한과 이용 상태를
                        관리합니다.
                    </p>
                </div>

                <div className="admin-users-count">
                    <span>전체 회원</span>
                    <strong>
                        {totalElements.toLocaleString()}
                    </strong>
                </div>
            </header>

            <form
                className="admin-users-search"
                onSubmit={handleSearch}
            >
                <div className="admin-users-search-input">
                    <span aria-hidden="true">⌕</span>

                    <input
                        type="search"
                        value={keyword}
                        onChange={(event) =>
                            setKeyword(event.target.value)
                        }
                        placeholder="이메일 또는 닉네임 검색"
                    />
                </div>

                <button type="submit">검색</button>

                {(keyword || searchKeyword) && (
                    <button
                        type="button"
                        className="admin-users-reset-button"
                        onClick={handleResetSearch}
                    >
                        초기화
                    </button>
                )}
            </form>

            {errorMessage && (
                <div
                    className="admin-users-error"
                    role="alert"
                >
                    <span>{errorMessage}</span>

                    <button
                        type="button"
                        onClick={() => setErrorMessage("")}
                        aria-label="오류 메시지 닫기"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="admin-users-table-card">
                {loading ? (
                    <div className="admin-users-state">
                        <div className="admin-users-spinner" />
                        <p>회원 목록을 불러오고 있습니다.</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="admin-users-state">
                        <strong>조회된 회원이 없습니다.</strong>
                        <p>
                            검색어를 변경하거나 전체 회원을
                            확인해 주세요.
                        </p>
                    </div>
                ) : (
                    <div className="admin-users-table-wrapper">
                        <table className="admin-users-table">
                            <thead>
                            <tr>
                                <th>회원</th>
                                <th>권한</th>
                                <th>온보딩</th>
                                <th>이용 상태</th>
                                <th>가입일</th>
                                <th>관리</th>
                            </tr>
                            </thead>

                            <tbody>
                            {users.map((user) => {
                                const processing =
                                    processingUserId ===
                                    user.id;

                                return (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="admin-user-identity">
                                                    <span className="admin-user-avatar">
                                                        {(
                                                            user.nickname ||
                                                            user.email ||
                                                            "U"
                                                        )
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>

                                                <div>
                                                    <strong>
                                                        {user.nickname ||
                                                            "닉네임 미설정"}
                                                    </strong>

                                                    <small>
                                                        {user.email}
                                                    </small>

                                                    <em>
                                                        ID {user.id}
                                                    </em>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <select
                                                className={`admin-user-role-select admin-user-role-select--${user.role?.toLowerCase()}`}
                                                value={user.role}
                                                disabled={
                                                    processing
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    handleRoleChange(
                                                        user,
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                            >
                                                <option value="ROLE_USER">
                                                    일반 회원
                                                </option>

                                                <option value="ROLE_DOCTOR">
                                                    의료진
                                                </option>

                                                <option value="ROLE_ADMIN">
                                                    관리자
                                                </option>
                                            </select>
                                        </td>

                                        <td>
                                                <span
                                                    className={
                                                        user.onboardingCompleted
                                                            ? "admin-user-badge admin-user-badge--complete"
                                                            : "admin-user-badge admin-user-badge--waiting"
                                                    }
                                                >
                                                    {user.onboardingCompleted
                                                        ? "완료"
                                                        : "미완료"}
                                                </span>
                                        </td>

                                        <td>
                                                <span
                                                    className={
                                                        user.suspended
                                                            ? "admin-user-badge admin-user-badge--suspended"
                                                            : "admin-user-badge admin-user-badge--active"
                                                    }
                                                >
                                                    {user.suspended
                                                        ? "정지"
                                                        : "정상"}
                                                </span>
                                        </td>

                                        <td>
                                            {formatDate(
                                                user.createdAt
                                            )}
                                        </td>

                                        <td>
                                            <div className="admin-user-actions">
                                                <button
                                                    type="button"
                                                    className="admin-user-detail-button"
                                                    disabled={
                                                        processing
                                                    }
                                                    onClick={() =>
                                                        handleOpenDetail(
                                                            user.id
                                                        )
                                                    }
                                                >
                                                    상세
                                                </button>

                                                {user.suspended ? (
                                                    <button
                                                        type="button"
                                                        className="admin-user-release-button"
                                                        disabled={
                                                            processing
                                                        }
                                                        onClick={() =>
                                                            handleReleaseSuspension(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        정지 해제
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="admin-user-suspend-button"
                                                        disabled={
                                                            processing
                                                        }
                                                        onClick={() =>
                                                            handleOpenSuspension(
                                                                user
                                                            )
                                                        }
                                                    >
                                                        정지
                                                    </button>
                                                )}
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
                    <div className="admin-users-pagination">
                        <button
                            type="button"
                            disabled={page === 0}
                            onClick={() =>
                                setPage((current) =>
                                    Math.max(0, current - 1)
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
                                setPage((current) =>
                                    current + 1
                                )
                            }
                        >
                            다음
                        </button>
                    </div>
                )}
            </div>

            {selectedUser && (
                <div
                    className="admin-user-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setSelectedUser(null);
                        }
                    }}
                >
                    <section
                        className="admin-user-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="admin-user-detail-title"
                    >
                        <header>
                            <div>
                                <span>USER DETAIL</span>
                                <h2 id="admin-user-detail-title">
                                    회원 상세 정보
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedUser(null)
                                }
                                aria-label="회원 상세 닫기"
                            >
                                ×
                            </button>
                        </header>

                        <div className="admin-user-detail-profile">
                            <span>
                                {(
                                    selectedUser.nickname ||
                                    selectedUser.email ||
                                    "U"
                                )
                                    .charAt(0)
                                    .toUpperCase()}
                            </span>

                            <div>
                                <strong>
                                    {selectedUser.nickname ||
                                        "닉네임 미설정"}
                                </strong>
                                <p>{selectedUser.email}</p>
                            </div>
                        </div>

                        <dl className="admin-user-detail-list">
                            <div>
                                <dt>회원 번호</dt>
                                <dd>{selectedUser.id}</dd>
                            </div>

                            <div>
                                <dt>권한</dt>
                                <dd>
                                    {getRoleLabel(
                                        selectedUser.role
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt>온보딩</dt>
                                <dd>
                                    {selectedUser.onboardingCompleted
                                        ? "완료"
                                        : "미완료"}
                                </dd>
                            </div>

                            <div>
                                <dt>이용 상태</dt>
                                <dd>
                                    {selectedUser.suspended
                                        ? "정지"
                                        : "정상"}
                                </dd>
                            </div>

                            <div>
                                <dt>가입일</dt>
                                <dd>
                                    {formatDate(
                                        selectedUser.createdAt
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt>마지막 수정</dt>
                                <dd>
                                    {formatDate(
                                        selectedUser.updatedAt
                                    )}
                                </dd>
                            </div>
                        </dl>

                        {selectedUser.suspended && (
                            <div className="admin-user-suspension-info">
                                <strong>정지 정보</strong>

                                <p>
                                    {selectedUser.suspensionReason ||
                                        "정지 사유 없음"}
                                </p>

                                <small>
                                    정지일:{" "}
                                    {formatDate(
                                        selectedUser.suspendedAt
                                    )}
                                </small>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {suspensionTarget && (
                <div
                    className="admin-user-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            handleCloseSuspension();
                        }
                    }}
                >
                    <form
                        className="admin-user-modal admin-user-suspension-modal"
                        onSubmit={handleSuspendUser}
                    >
                        <header>
                            <div>
                                <span>SUSPENSION</span>
                                <h2>회원 이용 정지</h2>
                            </div>

                            <button
                                type="button"
                                onClick={handleCloseSuspension}
                                aria-label="정지 창 닫기"
                            >
                                ×
                            </button>
                        </header>

                        <p className="admin-user-suspension-guide">
                            <strong>
                                {suspensionTarget.email}
                            </strong>
                            회원의 서비스 이용을 정지합니다.
                        </p>

                        <label
                            className="admin-user-reason-field"
                            htmlFor="suspensionReason"
                        >
                            <span>
                                정지 사유
                                <em>*</em>
                            </span>

                            <textarea
                                id="suspensionReason"
                                value={suspensionReason}
                                maxLength={500}
                                autoFocus
                                placeholder="회원에게 안내할 정지 사유를 입력해 주세요."
                                onChange={(event) =>
                                    setSuspensionReason(
                                        event.target.value
                                    )
                                }
                            />

                            <small>
                                {suspensionReason.length} / 500
                            </small>
                        </label>

                        <div className="admin-user-modal-actions">
                            <button
                                type="button"
                                onClick={handleCloseSuspension}
                            >
                                취소
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    processingUserId ===
                                    suspensionTarget.id
                                }
                            >
                                {processingUserId ===
                                suspensionTarget.id
                                    ? "처리 중..."
                                    : "회원 정지"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}