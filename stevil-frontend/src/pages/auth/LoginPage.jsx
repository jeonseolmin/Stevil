import { Link } from "react-router-dom";

import googleIcon from "../../assets/social/google.svg";
import kakaoButton from "../../assets/social/kakao.png";
import naverButton from "../../assets/social/naver.png";

import "./LoginPage.css";


export default function LoginPage() {
    const handleSocialLogin = (provider) => {
        window.location.assign(
            `${import.meta.env.VITE_SERVER_URL}/oauth2/authorization/${provider}`
        );
    };

    return (
        <section className="login-card" aria-labelledby="login-title">
            <div className="login-heading">
                <span className="login-label">START WITH STEVIL</span>

                <h1 id="login-title">건강한 변화의 시작</h1>

                <p>
                    사용하실 계정을 선택하고
                    <br />
                    Stevil을 시작해 보세요.
                </p>
            </div>
            <div className="social-login-list">
                <button
                    type="button"
                    className="google-login-button"
                    onClick={() => handleSocialLogin("google")}
                >
                    <img src={googleIcon} alt="" aria-hidden="true" />
                    <span>Google로 계속하기</span>
                </button>

                <button
                    type="button"
                    className="official-image-button"
                    onClick={() => handleSocialLogin("kakao")}
                    aria-label="카카오 로그인"
                >
                    <img src={kakaoButton} alt="" aria-hidden="true" />
                </button>

                <button
                    type="button"
                    className="official-image-button official-image-button--naver"
                    onClick={() => handleSocialLogin("naver")}
                    aria-label="네이버 로그인"
                >
                    <img src={naverButton} alt="" aria-hidden="true" />
                </button>
            </div>

            <p className="login-agreement">
                계속 진행하면 Stevil의{" "}
                <Link to="/terms">이용약관</Link> 및{" "}
                <Link to="/privacy">개인정보처리방침</Link>에 동의하는 것으로
                간주됩니다.
            </p>
        </section>
    );
}