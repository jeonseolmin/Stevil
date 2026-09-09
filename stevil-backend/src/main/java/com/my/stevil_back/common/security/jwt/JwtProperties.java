package com.my.stevil_back.common.security.jwt;

import lombok.Getter;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

@Component
@Getter
public class JwtProperties {
    private final String secret;
    private final Long accessExpiration;

    public JwtProperties(
            @Value("${spring.jwt.secret}") String secret,
            @Value("${spring.jwt.access-expiration}") Long accessExpiration
    ) {
        this.secret = secret;
        this.accessExpiration = accessExpiration;
    }
}
