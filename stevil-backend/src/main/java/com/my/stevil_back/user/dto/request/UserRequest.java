package com.my.stevil_back.user.dto.request;

import lombok.Data;

@Data
public class UserRequest {
    private String email;
    private String passwordHash;
    private String nickName;
}
