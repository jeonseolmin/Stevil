package com.my.stevil_back.common.security.oauth.service;

import com.my.stevil_back.common.security.oauth.info.OAuth2UserInfo;
import com.my.stevil_back.common.security.oauth.info.OAuth2UserInfoFactory;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.ProviderType;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

@Service @RequiredArgsConstructor
public class CustomOAuth2UserService  extends DefaultOAuth2UserService {
    private final UserRepository userRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) {

        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId =
                userRequest.getClientRegistration()
                        .getRegistrationId();

        OAuth2UserInfo userInfo =
                OAuth2UserInfoFactory.getOAuth2UserInfo(
                        registrationId,
                        oAuth2User.getAttributes()
                );

        String email = userInfo.getEmail();
        String name = userInfo.getName();
        String providerId = userInfo.getProviderId();
        ProviderType providerType = userInfo.getProviderType();

        User user = userRepository.findByEmail(email)
                .orElse(null);

        if (user == null) {
            user = User.builder()
                    .email(email)
                    .userName(name)
                    .password("SOCIAL_LOGIN_USER")
                    .role(UserRole.ROLE_USER)
                    .provider(providerType)
                    .providerId(providerId)
                    .build();

            userRepository.save(user);
        } else {
            if (user.getProvider() == null) {
                user.setProvider(providerType);
                user.setProviderId(providerId);
                userRepository.save(user);
            }
        }

        return new CustomUserDetails(
                user,
                oAuth2User.getAttributes()
        );
    }
}
