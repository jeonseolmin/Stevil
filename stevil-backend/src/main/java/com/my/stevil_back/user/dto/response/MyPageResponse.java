package com.my.stevil_back.user.dto.response;

import com.my.stevil_back.user.entity.User;
import lombok.Builder;
import lombok.Getter;


@Getter
@Builder
public class MyPageResponse {
    private String email;
    private String nickname;
    private String profileImage;

    public static MyPageResponse from(User user) {
        return MyPageResponse.builder()
                .nickname(user.getNickname())
                .email(user.getEmail())
                .profileImage(user.getProfileImage())
                .build();
    }
}
