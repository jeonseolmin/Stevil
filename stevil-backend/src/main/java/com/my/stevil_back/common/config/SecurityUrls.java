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
<<<<<<< HEAD
            "/api/community/**",

            "/ws-stomp/**",

            "/api/ai/**",


=======

            "/ws-stomp/**",

>>>>>>> 72a74fbd90ffd7829ad6b6c4aa7e3f417a105c1c
            "/api/partnership-inquiries"
    };

    public static final String[] ADMIN_URLS = {
            "/api/admin/**",
            "/api/ads/admin/**"
<<<<<<< HEAD
=======
    };

    public static final String[] DOCTOR_URLS = {
            "/api/doctor/**"
>>>>>>> 72a74fbd90ffd7829ad6b6c4aa7e3f417a105c1c
    };

    public static final String[] USER_URLS = {
            "/api/ai/**",

            "/api/planner/**",
            "/api/planner",
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

            "/api/patient-reports/**",

            "/api/ads/active",
            "/api/ads/dashboard-ads"
    };

    private SecurityUrls() {
    }
}
