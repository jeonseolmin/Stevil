package com.my.stevil_back.common.security.oauth.info;

import com.my.stevil_back.auth.social.entity.enumType.ProviderType;

public interface OAuth2UserInfo {
    ProviderType getProviderType();
    String getProviderId();
    String getEmail();
    String getName();
}
