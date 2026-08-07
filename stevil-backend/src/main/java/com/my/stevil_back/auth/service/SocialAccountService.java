package com.my.stevil_back.auth.service;

import com.my.stevil_back.auth.social.dto.SocialAccountResponse;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.auth.social.repository.SocialAccountRepository;
import com.my.stevil_back.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SocialAccountService {

    private final SocialAccountRepository socialAccountRepository;

    public Optional<SocialAccount> findAccount(
            ProviderType provider,
            String providerUserId
    ) {
        return socialAccountRepository
                .findByProviderAndProviderUserId(
                        provider,
                        providerUserId
                );
    }

    public User findConnectedUser(
            ProviderType provider,
            String providerUserId
    ) {
        SocialAccount socialAccount = socialAccountRepository
                .findByProviderAndProviderUserId(
                        provider,
                        providerUserId
                )
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "연결된 소셜 계정을 찾을 수 없습니다."
                        )
                );

        return socialAccount.getUser();
    }

    public List<SocialAccountResponse> getAccounts(Long userId) {
        return socialAccountRepository
                .findAllByUserId(userId)
                .stream()
                .map(SocialAccountResponse::from)
                .toList();
    }

    @Transactional
    public SocialAccount connect(
            User user,
            ProviderType provider,
            String providerUserId,
            String providerEmail
    ) {
        Optional<SocialAccount> existingAccount =
                socialAccountRepository
                        .findByProviderAndProviderUserId(
                                provider,
                                providerUserId
                        );

        if (existingAccount.isPresent()) {
            SocialAccount account = existingAccount.get();

            if (!account.getUser().getId().equals(user.getId())) {
                throw new IllegalStateException(
                        "이미 다른 회원에게 연결된 소셜 계정입니다."
                );
            }

            account.updateProviderEmail(providerEmail);
            return account;
        }

        SocialAccount socialAccount = SocialAccount.create(
                user,
                provider,
                providerUserId,
                providerEmail
        );

        return socialAccountRepository.save(socialAccount);
    }

    @Transactional
    public void disconnect(
            Long userId,
            Long socialAccountId
    ) {
        SocialAccount socialAccount = socialAccountRepository
                .findById(socialAccountId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "소셜 계정을 찾을 수 없습니다."
                        )
                );

        if (!socialAccount.getUser().getId().equals(userId)) {
            throw new IllegalStateException(
                    "본인의 소셜 계정만 연결 해제할 수 있습니다."
            );
        }

        long connectedAccountCount =
                socialAccountRepository.countByUserId(userId);

        if (connectedAccountCount <= 1) {
            throw new IllegalStateException(
                    "최소 한 개의 로그인 계정은 유지해야 합니다."
            );
        }

        socialAccountRepository.delete(socialAccount);
    }
}
