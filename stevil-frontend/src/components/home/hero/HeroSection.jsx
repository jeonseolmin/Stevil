import { Link } from "react-router-dom";
import "./HeroSection.css";


export default function HeroSection() {
    return (
        <section className="hero-section" aria-labelledby="hero-title">
            <div className="page-container hero-container">
                <div className="hero-content">
          <span className="hero-eyebrow">
            GLP-1 치료 여정을 한곳에서
          </span>

                    <h1 id="hero-title" className="hero-title">
                        건강한 변화를 위한
                        <br />
                        <strong>나만의 한 걸음</strong>
                    </h1>

                    <p className="hero-description">
                        체중과 식단, 운동, 투약 일정을 간편하게 기록하고
                        <br className="hero-desktop-break" />
                        치료 과정을 한눈에 확인해보세요.
                    </p>

                    <div className="hero-actions">
                        <Link to="/login" className="primary-button">
                            무료로 시작하기
                            <span aria-hidden="true">→</span>
                        </Link>

                        <a href="#features" className="secondary-button">
                            주요 기능 보기
                        </a>
                    </div>

                    <ul className="hero-benefits" aria-label="Stevil 주요 장점">
                        <li>
              <span className="hero-check" aria-hidden="true">
                ✓
              </span>
                            간편한 건강 기록
                        </li>

                        <li>
              <span className="hero-check" aria-hidden="true">
                ✓
              </span>
                            투약 일정 관리
                        </li>

                        <li>
              <span className="hero-check" aria-hidden="true">
                ✓
              </span>
                            맞춤형 변화 확인
                        </li>
                    </ul>
                </div>

                <div className="hero-visual" aria-label="Stevil 대시보드 예시">
                    <div className="hero-decoration hero-decoration--top" />
                    <div className="hero-decoration hero-decoration--bottom" />

                    <div className="dashboard-preview">
                        <div className="preview-header">
                            <div>
                                <span className="preview-greeting">안녕하세요</span>
                                <strong>오늘의 건강 기록</strong>
                            </div>

                            <span className="preview-date">8월 10일</span>
                        </div>

                        <div className="preview-progress-card">
                            <div className="preview-progress-heading">
                                <div>
                                    <span>목표 체중까지</span>
                                    <strong>진행률 38%</strong>
                                </div>

                                <span className="preview-progress-value">-9.4kg</span>
                            </div>

                            <div
                                className="preview-progress-track"
                                role="progressbar"
                                aria-label="목표 체중 진행률"
                                aria-valuemin="0"
                                aria-valuemax="100"
                                aria-valuenow="38"
                            >
                                <span />
                            </div>

                            <div className="preview-weight-row">
                                <span>시작 112kg</span>
                                <span>현재 102.6kg</span>
                                <span>목표 88kg</span>
                            </div>
                        </div>

                        <div className="preview-record-grid">
                            <article className="preview-record-card">
                <span className="preview-record-icon" aria-hidden="true">
                  W
                </span>
                                <span>오늘 체중</span>
                                <strong>
                                    102.6<small>kg</small>
                                </strong>
                            </article>

                            <article className="preview-record-card">
                <span className="preview-record-icon" aria-hidden="true">
                  M
                </span>
                                <span>식단 기록</span>
                                <strong>
                                    2<small>회</small>
                                </strong>
                            </article>

                            <article className="preview-record-card">
                <span className="preview-record-icon" aria-hidden="true">
                  E
                </span>
                                <span>운동</span>
                                <strong>
                                    45<small>분</small>
                                </strong>
                            </article>
                        </div>

                        <div className="preview-schedule-card">
                            <div className="preview-schedule-icon" aria-hidden="true">
                                1
                            </div>

                            <div>
                                <span>다음 투약 예정일</span>
                                <strong>8월 14일 목요일</strong>
                            </div>

                            <span className="preview-schedule-dday">D-4</span>
                        </div>
                    </div>

                    <div className="hero-floating-card hero-floating-card--record">
            <span className="floating-card-icon" aria-hidden="true">
              ✓
            </span>

                        <div>
                            <strong>오늘의 기록 완료</strong>
                            <span>꾸준히 잘하고 있어요</span>
                        </div>
                    </div>

                    <div className="hero-floating-card hero-floating-card--schedule">
                        <span>다음 병원 일정</span>
                        <strong>8월 21일</strong>
                    </div>
                </div>
            </div>
        </section>
    );
}