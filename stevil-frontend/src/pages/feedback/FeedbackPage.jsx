import { useState } from "react";
import axiosInstance from "../../api/axiosInstance";
import "./FeedbackPage.css";

export default function FeedbackPage() {
    const [rating, setRating] = useState(0);
    const [content, setContent] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (rating === 0) {
            alert("서비스 만족도 별점을 선택해 주세요.");
            return;
        }
        if (content.trim().length === 0) {
            alert("상세한 의견을 입력해 주세요.");
            return;
        }

        try {
            setIsSubmitting(true);
            
            await axiosInstance.post("/feedbacks", {
                rating,
                content: content.trim()
            });
            
            setSubmitted(true);
        } catch (error) {
            console.error("피드백 제출 실패:", error);
            alert("피드백 제출에 실패했습니다. 다시 시도해 주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 제출 완료 화면
    if (submitted) {
        return (
            <div className="feedback-page-container">
                <div className="feedback-success-card">
                    <h2>소중한 의견 감사합니다!</h2>
                    <p>보내주신 피드백은 Stevil을 더 나은 서비스로 만드는 데 큰 도움이 됩니다.</p>
                    <button onClick={() => window.location.href = '/'}>홈으로 돌아가기</button>
                </div>
            </div>
        );
    }

    return (
        <div className="feedback-page-container">
            <div className="feedback-card">
                <h1>Stevil 서비스 피드백</h1>
                <p>건강한 변화, 어떻게 경험하고 계신가요?</p>

                <form onSubmit={handleSubmit}>
                    <div className="feedback-rating">
                        <label>서비스 만족도</label>
                        <div className="stars">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={star <= rating ? "star-active" : "star-inactive"}
                                    onClick={() => setRating(star)}
                                    aria-label={`${star}점`}
                                >
                                    ★
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="feedback-content">
                        <label htmlFor="content">상세한 의견을 들려주세요</label>
                        <textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="좋았던 점, 아쉬운 점, 바라는 점 등 자유롭게 작성해 주세요."
                            rows={6}
                            maxLength={1000}
                        />
                        <small>{content.length} / 1000</small>
                    </div>

                    <button 
                        type="submit" 
                        className="feedback-submit-btn" 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "제출 중..." : "피드백 제출하기"}
                    </button>
                </form>
            </div>
        </div>
    );
}