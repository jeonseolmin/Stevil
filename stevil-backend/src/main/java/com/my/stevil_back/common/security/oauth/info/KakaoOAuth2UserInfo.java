package com.my.stevil_back.common.security.oauth.info;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import lombok.RequiredArgsConstructor;

import java.util.Map;

@RequiredArgsConstructor
public class KakaoOAuth2UserInfo implements  OAuth2UserInfo{
    private final Map<String, Object> attributes;

    @Override
    public ProviderType getProviderType() {
        return ProviderType.KAKAO;
    }

    @Override
    public String getProviderId() {
        return String.valueOf(attributes.get("id"));
    }

    @Override
    public String getEmail() {

        Map<String, Object> kakaoAccount =
                (Map<String, Object>) attributes.get("kakao_account");

        if (kakaoAccount == null) {
            return getProviderId() + "@kakao.local";
        }

        Object email = kakaoAccount.get("email");

        if (email == null) {
            return getProviderId() + "@kakao.local";
        }

        return String.valueOf(email);
    }

    @Override
    public String getName() {

        Map<String, Object> properties =
                (Map<String, Object>) attributes.get("properties");

        return String.valueOf(
                properties.get("nickname")
        );
    }

    @Override
    public String getProfileImage() {
        return String.valueOf(attributes.get("profileImage"));
    }
}