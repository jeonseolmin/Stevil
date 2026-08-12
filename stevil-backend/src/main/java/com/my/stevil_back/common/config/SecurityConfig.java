package com.my.stevil_back.common.config;

import com.my.stevil_back.common.security.jwt.JwtAuthenticationFilter;
import com.my.stevil_back.common.security.jwt.JwtUtil;
import com.my.stevil_back.common.security.oauth.handler.OAuth2FailureHandler;
import com.my.stevil_back.common.security.oauth.handler.OAuth2SuccessHandler;
import com.my.stevil_back.common.security.oauth.service.CustomOAuth2UserService;
import com.my.stevil_back.user.repository.UserRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final OAuth2FailureHandler oAuth2FailureHandler;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public SecurityConfig(
            JwtUtil jwtUtil,
            UserRepository userRepository,
            OAuth2SuccessHandler oAuth2SuccessHandler,
            OAuth2FailureHandler oAuth2FailureHandler,
            CustomOAuth2UserService customOAuth2UserService
    ) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
        this.oAuth2FailureHandler = oAuth2FailureHandler;
        this.customOAuth2UserService = customOAuth2UserService;
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

        // cors 설정
        http
                .csrf((auth) -> auth.disable());

        http
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();

                    config.setAllowedOriginPatterns(
                            List.of(
                                    "http://localhost:3000"
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

        http.addFilterBefore(
                new JwtAuthenticationFilter(
                        jwtUtil,
                        userRepository
                ),
                UsernamePasswordAuthenticationFilter.class
        );

        return http.build();
    }
}
