import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import ChatModal from '../chat/ChatModal'; 
import './MyPage.css'; 

export default function MyPage() {
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState(null);
    const [myPosts, setMyPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [currentPage, setCurrentPage] = useState(0); 
    const [totalPages, setTotalPages] = useState(0);

    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioInput, setBioInput] = useState('');

    const [chatRooms, setChatRooms] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState(null);
    const [selectedTargetNickname, setSelectedTargetNickname] = useState('');

    // 1. 처음 렌더링될 때 프로필 정보를 먼저 불러옵니다.
    useEffect(() => {
        fetchMyProfile();
    }, []);

    // 2. 현재 페이지가 바뀔 때마다 게시글 목록 새로 불러오기
    useEffect(() => {
        fetchMyPosts(currentPage);
    }, [currentPage]);

    const fetchMyProfile = async () => {
        try {
            const response = await axiosInstance.get('/users/profile/me');
            setProfile(response.data);
            setBioInput(response.data.bio || '');
            fetchMyChatRooms(response.data.nickname);
        } catch (error) {
            console.error("마이페이지 정보 로드 실패", error);
            alert("로그인이 필요하거나 정보를 불러올 수 없습니다.");
            navigate('/login');
        } finally {
            setIsLoading(false);
        }
    };


    const fetchMyChatRooms = async (nickname) => {
        if (!nickname) return;
        try {
            const response = await axiosInstance.get(`/chat/rooms?myNickname=${nickname}`); 
            setChatRooms(response.data);
        } catch (error) {
            console.error("채팅방 목록 로드 실패", error);
        }
    };

    const fetchMyPosts = async (page) => {
        try {
            const response = await axiosInstance.get(`/users/me/posts?page=${page}`);
            setMyPosts(response.data.content);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("게시글 로드 실패", error);
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

    const openChatRoom = (roomId, targetNickname) => {
        setSelectedRoomId(roomId);
        setSelectedTargetNickname(targetNickname);
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

                    {/* 내 채팅방 목록 영역 */}
                    <div className="mypage-section">
                        <div className="section-header">
                            <h3>내 채팅방 목록</h3>
                        </div>
                        
                        {chatRooms.length > 0 ? (
                            <ul className="mypage-post-list">
                                {chatRooms.map(room => (
                                    <li 
                                        key={room.roomId} 
                                        className="mypage-post-item" 
                                        onClick={() => openChatRoom(room.roomId, room.targetNickname)}
                                    >
                                        <div className="post-item-main">
                                            <span className="post-title" style={{ fontWeight: '700' }}>
                                                {room.targetNickname} 님과의 대화
                                            </span>
                                            <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                                                {room.lastMessage || '대화 내역이 없습니다.'}
                                            </span>
                                        </div>
                                        <div className="post-item-meta">
                                            <span>{room.lastMessageTime}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="empty-text">참여 중인 대화가 없습니다. 커뮤니티에서 대화를 시작해보세요!</p>
                        )}
                    </div>

                    <hr className="mypage-divider" />

                    {/* 내가 작성한 글 관리 */}
                    <div className="mypage-section">
                        <div className="section-header">
                            <h3>내가 작성한 글</h3>
                        </div>
                        
                        {myPosts.length > 0 ? (
                            <>
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

                                {/* 페이지네이션 */}
                                {totalPages > 1 && (
                                    <div className="mypage-pagination">
                                        <button
                                            className="page-nav-btn"
                                            disabled={currentPage === 0}
                                            onClick={() => setCurrentPage(prev => prev - 1)}
                                        >
                                            이전
                                        </button>

                                        <div className="page-numbers">
                                            {Array.from({ length: totalPages }, (_, i) => (
                                                <button
                                                    key={i}
                                                    className={`page-num-btn ${currentPage === i ? 'active' : ''}`}
                                                    onClick={() => setCurrentPage(i)}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>

                                        <button
                                            className="page-nav-btn"
                                            disabled={currentPage >= totalPages - 1}
                                            onClick={() => setCurrentPage(prev => prev + 1)}
                                        >
                                            다음
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="empty-text">아직 작성한 글이 없습니다.</p>
                        )}
                    </div>

                </div>
            </div>

            {selectedRoomId && (
                <ChatModal 
                    roomId={selectedRoomId}
                    myNickname={profile.nickname}
                    targetNickname={selectedTargetNickname} 
                    onClose={() => {
                        setSelectedRoomId(null);
                        fetchMyChatRooms(profile.nickname);
                    }}
                />
            )}
        </div>
    );
}