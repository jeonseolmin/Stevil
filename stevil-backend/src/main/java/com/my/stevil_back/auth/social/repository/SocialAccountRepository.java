package com.my.stevil_back.auth.social.repository;

import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SocialAccountRepository
        extends JpaRepository<SocialAccount, Long> {

    Optional<SocialAccount> findByProviderAndProviderUserId(
            ProviderType provider,
            String providerUserId
    );

    List<SocialAccount> findAllByUserId(Long userId);

    boolean existsByProviderAndProviderUserId(
            ProviderType provider,
            String providerUserId
    );

    long countByUserId(Long userId);
}
