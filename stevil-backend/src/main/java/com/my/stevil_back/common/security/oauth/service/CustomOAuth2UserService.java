package com.my.stevil_back.common.security.oauth.service;

import com.my.stevil_back.auth.service.SocialAccountService;
import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.common.security.oauth.info.OAuth2UserInfo;
import com.my.stevil_back.common.security.oauth.info.OAuth2UserInfoFactory;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import com.my.stevil_back.user.entity.enumType.UserRole;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

@Service @RequiredArgsConstructor
public class CustomOAuth2UserService  extends DefaultOAuth2UserService {
    private final UserRepository userRepository;
    private final SocialAccountService socialAccountService;
    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {

        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest
                .getClientRegistration()
                .getRegistrationId();

        OAuth2UserInfo userInfo =
                OAuth2UserInfoFactory.getOAuth2UserInfo(
                        registrationId,
                        oAuth2User.getAttributes()
                );

        String email = userInfo.getEmail();
        String name = userInfo.getName();
        String providerId = userInfo.getProviderId();
        String profileImage = userInfo.getProfileImage();
        ProviderType providerType = userInfo.getProviderType();

        Optional<SocialAccount> existingAccount =
                socialAccountService.findAccount(
                        providerType,
                        providerId
                );

        User user;

        if (existingAccount.isPresent()) {
            user = existingAccount.get().getUser();
        } else {
            user = User.builder()
                    .email(email)
                    .nickname(name)
                    .profileImage(profileImage)
                    .role(UserRole.ROLE_USER)
                    .build();

            userRepository.save(user);

            socialAccountService.connect(
                    user,
                    providerType,
                    providerId,
                    email
            );
        }

        return new CustomUserDetails(
                user,
                oAuth2User.getAttributes()
        );
    }
}
