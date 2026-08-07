package com.my.stevil_back.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private final AuthenticationConfiguration authenticationConfiguration;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final OAuth2FailureHandler oAuth2FailureHandler;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final JwtUtil jwtUtil;

    public SecurityConfig(AuthenticationConfiguration authenticationConfiguration, JwtUtil jwtUtil,OAuth2SuccessHandler oAuth2SuccessHandler,OAuth2FailureHandler oAuth2FailureHandler,CustomOAuth2UserService customOAuth2UserService) {
        this.authenticationConfiguration = authenticationConfiguration;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
        this.oAuth2FailureHandler = oAuth2FailureHandler;
        this.customOAuth2UserService = customOAuth2UserService;
        this.jwtUtil = jwtUtil;

    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public BCryptPasswordEncoder bCryptPasswordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // csrf disable
        http
                .csrf((auth) -> auth.disable());
        // Form Login 방식  -> disable
        http
                .formLogin((auth) -> auth.disable());
        // http basic  인증 방식 -> disable
        http
                .httpBasic((auth) -> auth.disable());

//        http
//                .exceptionHandling(exception -> exception
//                        .authenticationEntryPoint((request, response, authException) -> {
//                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
//                        })
//                        .accessDeniedHandler((request, response, accessDeniedException) -> {
//                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
//                        })
//                );

        /*
            경로별 인가 작업
            Config 파일의 SecurityUrls에서 통합 관리
         */

        http
                .authorizeHttpRequests((auth) -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/uploads/**").permitAll()

                        // 여기에 직접 오픈할 GET 주소들을 한 줄로 박아버립니다.
                        .requestMatchers(HttpMethod.GET, "/api/community", "/api/community/**", "/api/posts/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        // PUBLIC_URLS
                        .requestMatchers(
                                SecurityUrls.PUBLIC_URLS
                        ).permitAll()

                        // USER_URLS
                        .requestMatchers(
                                SecurityUrls.USER_URLS
                        ).hasAnyRole("USER", "ADMIN")

                        // ADMIN_URLS
                        .requestMatchers(
                                SecurityUrls.ADMIN_URLS
                        ).hasRole("ADMIN")

                        // 그 외

                        .anyRequest().authenticated()
                );
        http
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2SuccessHandler)
                        .failureHandler(oAuth2FailureHandler)
                );

        LoginFilter loginFilter =
                new LoginFilter(
                        authenticationManager(authenticationConfiguration),
                        jwtUtil
                );

        loginFilter.setFilterProcessesUrl("/faultfinder/login");

        http
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtUtil),
                        UsernamePasswordAuthenticationFilter.class
                );

        http
                .addFilterAt(
                        loginFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        http
                .sessionManagement((session) ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        // cors 설정
        http
                .csrf((auth) -> auth.disable());

        http
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();

                    config.setAllowedOriginPatterns(
                            List.of(
                                    "http://localhost:3000",
                                    "http://54.79.10.188",
                                    "http://54.79.10.188:*",
                                    "https://faultfinder.link",
                                    "https://www.faultfinder.link"
                            )
                    );

                    config.setAllowedMethods(
                            List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                    );

                    config.setAllowedHeaders(List.of("*"));
                    config.setExposedHeaders(List.of("Authorization"));
                    config.setAllowCredentials(true);

                    return config;
                }));

        http
                .formLogin((auth) -> auth.disable());

        return http.build();
    }
}
