package com.my.stevil_back.content.dto.response;

import com.my.stevil_back.content.entity.HealthContent;
import com.my.stevil_back.content.entity.enumType.ContentCategory;
import com.my.stevil_back.content.entity.enumType.ContentStatus;

import java.time.LocalDateTime;

public record AdminContentResponse(

        Long id,

        ContentCategory category,

        String title,

        String summary,

        String content,

        String thumbnailUrl,

        String sourceUrl,

        ContentStatus status,

        Long authorId,

        String authorName,

        LocalDateTime createdAt,

        LocalDateTime updatedAt

) {

    public static AdminContentResponse from(
            HealthContent content
    ) {
        return new AdminContentResponse(
                content.getId(),
                content.getCategory(),
                content.getTitle(),
                content.getSummary(),
                content.getContent(),
                content.getThumbnailUrl(),
                content.getSourceUrl(),
                content.getStatus(),
                content.getAuthor().getId(),
                content.getAuthor().getNickname(),
                content.getCreatedAt(),
                content.getUpdatedAt()
        );
    }
}