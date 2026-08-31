import { useEffect, useState } from 'react';
import './ProfileCardModal.css';
import axiosInstance from '../../api/axiosInstance'; 

export default function ProfileCardModal({ targetUserEmail, onClose }) {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

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
                    <button className="action-btn" onClick={() => alert('1:1 대화 연결 기능 준비중!')}>
                        1:1 대화하기
                    </button>
                    <button className="action-btn report-btn" onClick={() => alert('신고 접수 기능 준비중!')}>
                        회원신고
                    </button>
                </div>

            </div>
        </div>
    );
}