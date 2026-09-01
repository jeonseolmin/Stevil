import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import './MyPage.css'; 

export default function MyPage() {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [myPosts, setMyPosts] = useState([]); // 💡 내가 쓴 글 상태 추가
    const [isLoading, setIsLoading] = useState(true);

    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioInput, setBioInput] = useState('');

    useEffect(() => {
        fetchMyData();
    }, []);

    // 💡 프로필 정보와 내가 쓴 글 목록을 동시에 불러오도록 수정
    const fetchMyData = async () => {
        try {
            const [profileRes, postsRes] = await Promise.all([
                axiosInstance.get('/users/profile/me'),
                axiosInstance.get('/users/me/posts') // 추가한 API 호출
            ]);
            
            setProfile(profileRes.data);
            setBioInput(profileRes.data.bio || '');
            setMyPosts(postsRes.data);
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
                                <button className="edit-btn" onClick={() => setIsEditingBio(true)}>수정</button>
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
                                        setBioInput(profile.bio || ''); 
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

                    <hr className="mypage-divider" />

                    {/* 💡 추가된 영역: 내가 작성한 글 관리 */}
                    <div className="mypage-section">
                        <div className="section-header">
                            <h3>내가 작성한 글</h3>
                        </div>
                        
                        {myPosts.length > 0 ? (
                            <ul className="mypage-post-list">
                                {myPosts.map(post => (
                                    <li 
                                        key={post.id} 
                                        className="mypage-post-item" 
                                        onClick={() => navigate(`/community/${post.id}`)}
                                    >
                                        <div className="post-item-main">
                                            <span className="post-category">[{post.category || '자유'}]</span>
                                            <span className="post-title">{post.title}</span>
                                        </div>
                                        <div className="post-item-meta">
                                            <span>{post.createdAt ? post.createdAt.substring(0, 10) : ''}</span>
                                            <span>조회 {post.viewCount || 0}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="empty-text">아직 작성한 글이 없습니다.</p>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}