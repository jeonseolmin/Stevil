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
            "/api/exercise-logs/**",
    };

    public static final String[] ADMIN_URLS = {
            "/api/admin/**"
    };

    public static final String[] USER_URLS = {
            "/api/users/",
            "/api/users/**",

            "/api/mypage",
            "/api/mypage/**",

            "/api/question",
            "/api/question/**",

            "/api/answer",
            "/api/answer/**",

            "/api/posts/**",

            "/api/reports",
            "/api/reports/**",

            "/api/onboarding",
            "/api/onboarding/**",
    };

    private SecurityUrls() {
    }
}