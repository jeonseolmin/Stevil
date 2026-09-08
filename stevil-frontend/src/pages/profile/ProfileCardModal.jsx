import { useState, useEffect } from 'react';
import './ProfileCardModal.css';
import ChatModal from '../chat/ChatModal';
import axiosInstance from '../../api/axiosInstance'; 

export default function ProfileCardModal({ targetUserEmail, onClose }) {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportReason, setReportReason] = useState('');

    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [chatRoomId, setChatRoomId] = useState(null);
    const [myNickname, setMyNickname] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await axiosInstance.get(`/users/profile?email=${targetUserEmail}`);
                setProfile(response.data);
            } catch (error) {
                console.error("프로필 조회 실패", error);
                alert("프로필 정보를 불러오는데 실패했습니다.");
                onClose();
            } finally {
                setIsLoading(false);
            }
        };

        if (targetUserEmail) {
            fetchProfile();
        }
    }, [targetUserEmail, onClose]);

    const submitUserReport = async () => {
        if (!reportReason.trim()) return alert("신고 사유를 입력해주세요.");

        try {
            await axiosInstance.post('/reports', {
                targetType: 'USER', // 유저 신고 타입
                targetId: profile.id, // 유저 ID
                category: 'ETC',
                reason: reportReason
            });
            alert('사용자 신고가 정상적으로 접수되었습니다.');
            setIsReportModalOpen(false);
            setReportReason('');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                alert(error.response.data);
            } else {
                alert('신고 처리 중 오류가 발생했습니다.');
            }
        }
    };

    const handleStartChat = async () => {
        try {
            const meRes = await axiosInstance.get('/users/profile/me');
            const nick = meRes.data.nickname;
            setMyNickname(nick);

            const roomRes = await axiosInstance.post(`/chat/room?myNickname=${nick}&targetNickname=${profile.nickname}`);
            setChatRoomId(roomRes.data);
            setIsChatModalOpen(true);
        } catch (error) {
            alert("대화를 시작할 수 없습니다.");
        }
    };

    if (isLoading) {
        return (
            <div className="profile-modal-backdrop" onClick={onClose}>
                <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                    <p style={{textAlign: 'center', color: '#64748b'}}>프로필을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="profile-modal-backdrop" onClick={onClose}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                
                <div className="profile-top">
                    <div className="profile-image-wrapper">
                        {profile.profileImage ? (
                            <img src={profile.profileImage} alt="프로필" />
                        ) : (
                            <div className="profile-placeholder">👤</div>
                        )}
                    </div>
                    <div className="profile-info">
                        <p>가입일 : {profile.joinDate}</p>
                        <p>약 투여일 수 : {profile.medicationDays}일</p>
                    </div>
                </div>

                <div className="profile-middle">
                    <h3>{profile.nickname} 회원</h3>

                    <div className="profile-bio">
                        "{profile.bio || '등록된 소개가 없습니다.'}"
                    </div>
                    
                    <div className="profile-stats">
                        <div className="stat-item">
                            <span className="stat-label">작성한 글</span>
                            <span className="stat-value">{profile.postCount || 0}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">작성한 댓글</span>
                            <span className="stat-value">{profile.commentCount || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="profile-bottom">
                    <button className="action-btn" onClick={handleStartChat}>
                        1:1 대화하기
                    </button>
                    <button className="action-btn report-btn" onClick={() => setIsReportModalOpen(true)}>
                        회원신고
                    </button>
                </div>

            </div>

            {isReportModalOpen && (
                <div className="ste-modal-bg" onClick={(e) => e.stopPropagation()}>
                    <div className="ste-modal-box">
                        <h3>사용자 신고</h3>
                        <p>규정에 위반되는 사용자격인지 확인 후 운영자에게 전달됩니다.</p>
                        <textarea 
                            placeholder="신고 사유를 상세히 입력해주세요 (예: 부적절한 프로필, 욕설 등)"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                        ></textarea>
                        <div className="ste-modal-btns">
                            <button className="ste-btn-secondary" onClick={() => setIsReportModalOpen(false)}>취소</button>
                            <button className="ste-btn-danger" onClick={submitUserReport}>신고 접수</button>
                        </div>
                    </div>
                </div>
            )}

            {isChatModalOpen && chatRoomId && (
                <ChatModal 
                    roomId={chatRoomId}
                    myNickname={myNickname}
                    targetNickname={profile.nickname}
                    onClose={() => setIsChatModalOpen(false)}
                />
            )}
        </div>
    );
}