package com.my.stevil_back.common.security.jwt;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/*
 * JWT 401 테스트 공용 토큰 생성기. 서버 키로 서명한 정상/만료 토큰과, 서버 키가 아닌 다른 키로 서명하거나
 * 변조한 토큰, 무서명(alg=none) 토큰을 만든다.
 */
final class JwtTestTokens {

    static final String SECRET = "test-secret-test-secret-test-secret-test-secret";
    static final long ACCESS_EXPIRATION_MS = 3_600_000L;
    static final String EMAIL = "user@example.com";

    private static final SecretKey SERVER_KEY = key(SECRET);
    private static final SecretKey OTHER_KEY = key("other-secret-other-secret-other-secret-other-xx");

    private JwtTestTokens() {
    }

    private static SecretKey key(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    static JwtUtil newJwtUtil() {
        JwtUtil jwtUtil = new JwtUtil(new JwtProperties(SECRET, ACCESS_EXPIRATION_MS));
        jwtUtil.init();
        return jwtUtil;
    }

    static String valid(String email) {
        return Jwts.builder().subject(email).claim("email", email).claim("role", "ROLE_USER")
                .expiration(inFuture()).signWith(SERVER_KEY).compact();
    }

    /** 서명은 유효하지만 이미 만료된 토큰(ExpiredJwtException). */
    static String expired(String email) {
        return Jwts.builder().subject(email).claim("email", email)
                .expiration(new Date(System.currentTimeMillis() - 3_600_000L)).signWith(SERVER_KEY).compact();
    }

    /** 다른 키로 서명한 토큰(SignatureException). */
    static String signatureMismatch(String email) {
        return Jwts.builder().subject(email).claim("email", email)
                .expiration(inFuture()).signWith(OTHER_KEY).compact();
    }

    /** 정상 토큰의 서명부만 바꾼 토큰(SignatureException). */
    static String tampered(String email) {
        String token = valid(email);
        int lastDot = token.lastIndexOf('.');
        return token.substring(0, lastDot + 1) + "AAAA" + token.substring(lastDot + 5);
    }

    /** alg=none 무서명 토큰(UnsupportedJwtException). */
    static String unsigned(String email) {
        return Jwts.builder().subject(email).claim("email", email).expiration(inFuture()).compact();
    }

    /** 서명은 유효하지만 email 클레임이 없는 토큰. */
    static String withoutEmailClaim() {
        return Jwts.builder().subject("no-email").claim("role", "ROLE_USER")
                .expiration(inFuture()).signWith(SERVER_KEY).compact();
    }

    /** 구조만 3분할이고 내용은 쓰레기(MalformedJwtException). */
    static String garbageThreeSegments() {
        return "a.b.c";
    }

    /** 점이 없는 임의 문자열(MalformedJwtException). */
    static String malformed() {
        return "stub-test";
    }

    private static Date inFuture() {
        return new Date(System.currentTimeMillis() + ACCESS_EXPIRATION_MS);
    }
}
