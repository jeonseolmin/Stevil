package com.my.stevil_back.common.security.oauth.info;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import lombok.RequiredArgsConstructor;

import java.util.Map;

@RequiredArgsConstructor
public class NaverOAuth2UserInfo implements OAuth2UserInfo {
    private final Map<String, Object> attributes;

    @SuppressWarnings("unchecked")
    private Map<String, Object> getResponse() {
        Object response = attributes.get("response");

        if (response instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }

        return Map.of();
    }

    @Override
    public ProviderType getProviderType() {
        return ProviderType.NAVER;
    }

    @Override
    public String getProviderId() {
        return String.valueOf(getResponse().get("id"));
    }

    @Override
    public String getEmail() {
        return String.valueOf(getResponse().get("email"));
    }

    @Override
    public String getName() {
        return String.valueOf(getResponse().get("name"));
    }

    @Override
    public String getProfileImage() {
        Map<String, Object> response = getResponse();

        Object profileImage = response.get("profile_image");

        return profileImage != null
                ? profileImage.toString()
                : null;
    }
}