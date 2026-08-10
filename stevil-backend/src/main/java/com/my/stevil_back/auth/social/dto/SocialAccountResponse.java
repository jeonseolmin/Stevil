package com.my.stevil_back.auth.social.dto;

import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.auth.social.entity.SocialAccount;

import java.time.LocalDateTime;

public record SocialAccountResponse(
        Long id,
        ProviderType provider,
        String providerEmail,
        LocalDateTime connectedAt
) {

    public static SocialAccountResponse from(SocialAccount socialAccount) {
        return new SocialAccountResponse(
                socialAccount.getId(),
                socialAccount.getProvider(),
                socialAccount.getProviderEmail(),
                socialAccount.getCreatedAt()
        );
    }
}