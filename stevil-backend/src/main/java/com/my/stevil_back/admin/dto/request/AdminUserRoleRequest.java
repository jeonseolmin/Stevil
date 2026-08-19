package com.my.stevil_back.admin.dto.request;

import com.my.stevil_back.user.entity.enumType.UserRole;
import jakarta.validation.constraints.NotNull;

public record AdminUserRoleRequest(

        @NotNull(message = "변경할 권한은 필수입니다.")
        UserRole role
) {
}