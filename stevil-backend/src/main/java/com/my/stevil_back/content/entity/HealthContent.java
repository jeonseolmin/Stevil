package com.my.stevil_back.content.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.content.entity.enumType.ContentCategory;
import com.my.stevil_back.content.entity.enumType.ContentStatus;
import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
        name = "health_contents",
        indexes = {
                @Index(
                        name = "idx_health_contents_category",
                        columnList = "category"
                ),
                @Index(
                        name = "idx_health_contents_status",
                        columnList = "status"
                ),
                @Index(
                        name = "idx_health_contents_created_at",
                        columnList = "created_at"
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class HealthContent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ContentCategory category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 500)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "thumbnail_url", length = 1000)
    private String thumbnailUrl;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContentStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "author_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_health_contents_author"
            )
    )
    private User author;

    @Builder
    private HealthContent(
            ContentCategory category,
            String title,
            String summary,
            String content,
            String thumbnailUrl,
            String sourceUrl,
            ContentStatus status,
            User author
    ) {
        this.category = category;
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.sourceUrl = sourceUrl;
        this.status = status != null
                ? status
                : ContentStatus.DRAFT;
        this.author = author;
    }

    public void update(
            ContentCategory category,
            String title,
            String summary,
            String content,
            String thumbnailUrl,
            String sourceUrl
    ) {
        this.category = category;
        this.title = title;
        this.summary = summary;
        this.content = content;
        this.thumbnailUrl = thumbnailUrl;
        this.sourceUrl = sourceUrl;
    }

    public void changeStatus(ContentStatus status) {
        this.status = status;
    }
}