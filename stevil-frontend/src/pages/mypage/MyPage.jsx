import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import './MyPage.css';

export default function MyPage() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioInput, setBioInput] = useState('');

    useEffect(() => {
        fetchMyProfile();
    }, []);

    const fetchMyProfile = async () => {
        try {
            const response = await axiosInstance.get('/users/profile/me');
            setProfile(response.data);
            setBioInput(response.data.bio || '');
        } catch (error) {
            console.error("마이페이지 정보 로드 실패", error);
            alert("로그인이 필요하거나 정보를 불러올 수 없습니다.");
            navigate('/login');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBioSave = async () => {
        try {
            await axiosInstance.put('/users/profile/bio', { bio: bioInput });
            // 성공 시 로컬 상태 업데이트 및 수정 모드 종료
            setProfile(prev => ({ ...prev, bio: bioInput }));
            setIsEditingBio(false);
            alert("한 줄 소개가 등록되었습니다.");
        } catch (error) {
            console.error("소개 업데이트 실패", error);
            alert("소개글 수정 중 오류가 발생했습니다.");
        }
    };

    if (isLoading) return <div className="mypage-wrapper">로딩중...</div>;
    if (!profile) return null;

    return (
        <div className="mypage-wrapper">
            <div className="mypage-container">
                <h1 className="mypage-title">마이페이지</h1>

                <div className="mypage-card">
                    {/* 상단 프로필 영역 */}
                    <div className="mypage-header">
                        <div className="mypage-avatar">
                            {profile.profileImage ? (
                                <img src={profile.profileImage} alt="프로필" />
                            ) : (
                                <span>👤</span>
                            )}
                        </div>
                        <div className="mypage-info">
                            <h2>{profile.nickname}</h2>
                            <p className="mypage-email">{profile.email}</p>
                            <p className="mypage-date">가입일: {profile.joinDate}</p>
                        </div>
                    </div>

                    <hr className="mypage-divider" />

                    {/* 한 줄 소개 영역 */}
                    <div className="mypage-section">
                        <div className="section-header">
                            <h3>나의 한 줄 소개</h3>
                            {!isEditingBio && (
                                <button className="edit-btn" onClick={() => setIsEditingBio(true)}>
                                    수정
                                </button>
                            )}
                        </div>

                        {isEditingBio ? (
                            <div className="bio-edit-area">
                                <input 
                                    type="text" 
                                    value={bioInput}
                                    onChange={(e) => setBioInput(e.target.value)}
                                    placeholder="커뮤니티 프로필에 표시될 소개글을 입력해주세요 (최대 50자)"
                                    maxLength={50}
                                />
                                <div className="bio-edit-actions">
                                    <button className="cancel-btn" onClick={() => {
                                        setIsEditingBio(false);
                                        setBioInput(profile.bio || ''); // 취소 시 원상복구
                                    }}>취소</button>
                                    <button className="save-btn" onClick={handleBioSave}>저장</button>
                                </div>
                            </div>
                        ) : (
                            <p className="bio-text">
                                {profile.bio ? `"${profile.bio}"` : "등록된 한 줄 소개가 없습니다. 나를 표현해보세요!"}
                            </p>
                        )}
                    </div>

                    <hr className="mypage-divider" />

                    {/* 커뮤니티 활동 요약 */}
                    <div className="mypage-section">
                        <h3>커뮤니티 활동</h3>
                        <div className="activity-stats">
                            <div className="stat-box">
                                <span className="stat-label">작성한 글</span>
                                <span className="stat-number">{profile.postCount}</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">작성한 댓글</span>
                                <span className="stat-number">{profile.commentCount}</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">약 투여일</span>
                                <span className="stat-number">{profile.medicationDays}일</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}