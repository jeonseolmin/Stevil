export default function DashboardWelcome({ nickname, profileImage }) {
    const displayName = nickname?.trim() || "사용자";

    return (
        <section className="dashboard-welcome">
            <div>
                <span className="dashboard-eyebrow">MY HEALTH JOURNEY</span>
                <span className="dashboard-eyebrow">TODAY</span>
                <h1>{displayName}님,<br />오늘도 건강한 하루 보내세요.</h1>
                <p>오늘의 기록부터, 궁금한 건강 정보까지 함께해요.</p>
                <p>작은 기록이 건강한 변화를 만듭니다.</p>
            </div>
            {profileImage ? (
                <img src={profileImage} alt={`${displayName}님의 프로필`} className="dashboard-profile-image" />
            ) : (
                <div className="dashboard-profile-placeholder" aria-hidden="true">{displayName.charAt(0)}</div>
            )}
        </section>
    );
}

