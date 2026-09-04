package com.my.stevil_back.common.config;

public class SecurityUrls {

    public static final String[] PUBLIC_URLS = {
            "/api",
            "/api/auth/**",
            "/api/auth/login",

            "/api/signup",

            "/oauth2/**",
            "/login/oauth2/**",
            "/login/oauth2/code/**",

            "/api/exercises/**",

            "/api/community",
            "/api/community/**",

            "/ws-stomp/**",

            "/api/ai/**"


    };

    public static final String[] ADMIN_URLS = {
            "/api/admin/**",
            "/api/ads/admin/**"
    };

    public static final String[] USER_URLS = {
            "/api/users/",
            "/api/users/**",

            "/api/onboarding",
            "/api/onboarding/**",

            "/api/dashboard",
            "/api/dashboard/**",

            "/api/hospitals",
            "/api/hospitals/**",

            "/api/mypage",
            "/api/mypage/**",

            "/api/question",
            "/api/question/**",

            "/api/answer",
            "/api/answer/**",

            "/api/posts/**",

            "/api/reports",
            "/api/reports/**",

            "/api/exercise-logs/**",

            "/api/injections/**",

            "/api/ads/request",
            "/api/ads/active"
    };

    private SecurityUrls() {
    }
}