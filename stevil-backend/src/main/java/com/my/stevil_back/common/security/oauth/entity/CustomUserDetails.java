package com.my.stevil_back.common.security.oauth.entity;

import com.my.stevil_back.user.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.List;
import java.util.Map;

@Getter
public class CustomUserDetails implements OAuth2User {

    private final User user;
    private final Map<String, Object> attributes;

    public CustomUserDetails(
            User user,
            Map<String, Object> attributes
    ) {
        this.user = user;
        this.attributes = attributes;
    }

    public CustomUserDetails(User user) {
        this(user, Map.of());
    }

    public Long getUserId() {
        return user.getId();
    }

    public String getEmail() {
        return user.getEmail();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority(user.getRole().name())
        );
    }

    @Override
    public String getName() {
        return user.getId() != null
                ? user.getId().toString()
                : user.getEmail();
    }
}
