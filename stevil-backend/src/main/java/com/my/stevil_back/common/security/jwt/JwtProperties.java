package com.my.stevil_back.common.security.jwt;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Getter
public class JwtProperties {

    private final String secret;
    private final Long accessExpiration;
    private final Long refreshExpiration;

    public JwtProperties(
            @Value("${spring.jwt.secret}")
            String secret,

            @Value("${spring.jwt.access-expiration}")
            Long accessExpiration,

            @Value("${spring.jwt.refresh-expiration}")
            Long refreshExpiration
    ) {
        this.secret = secret;
        this.accessExpiration = accessExpiration;
        this.refreshExpiration = refreshExpiration;
    }
}