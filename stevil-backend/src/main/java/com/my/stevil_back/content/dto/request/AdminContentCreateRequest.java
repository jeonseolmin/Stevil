package com.my.stevil_back.content.dto.request;

import com.my.stevil_back.content.entity.enumType.ContentCategory;
import com.my.stevil_back.content.entity.enumType.ContentStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AdminContentCreateRequest(

        @NotNull(message = "콘텐츠 분류는 필수입니다.")
        ContentCategory category,

        @NotBlank(message = "콘텐츠 제목은 필수입니다.")
        @Size(
                max = 200,
                message = "제목은 200자 이하로 입력해 주세요."
        )
        String title,

        @Size(
                max = 500,
                message = "요약은 500자 이하로 입력해 주세요."
        )
        String summary,

        @NotBlank(message = "콘텐츠 내용은 필수입니다.")
        String content,

        @Size(
                max = 1000,
                message = "썸네일 URL은 1000자 이하로 입력해 주세요."
        )
        String thumbnailUrl,

        @Size(
                max = 1000,
                message = "출처 URL은 1000자 이하로 입력해 주세요."
        )
        String sourceUrl,

        ContentStatus status
) {
}