package com.my.stevil_back.content.dto.request;

import com.my.stevil_back.content.entity.enumType.ContentStatus;
import jakarta.validation.constraints.NotNull;

public record AdminContentStatusRequest(

        @NotNull(message = "콘텐츠 상태는 필수입니다.")
        ContentStatus status

) {
}