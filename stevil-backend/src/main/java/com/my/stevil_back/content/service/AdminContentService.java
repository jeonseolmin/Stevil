package com.my.stevil_back.content.service;

import com.my.stevil_back.content.dto.request.AdminContentCreateRequest;
import com.my.stevil_back.content.dto.request.AdminContentUpdateRequest;
import com.my.stevil_back.content.dto.response.AdminContentResponse;
import com.my.stevil_back.content.entity.HealthContent;
import com.my.stevil_back.content.entity.enumType.ContentCategory;
import com.my.stevil_back.content.entity.enumType.ContentStatus;
import com.my.stevil_back.content.repository.HealthContentRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminContentService {

    private final HealthContentRepository
            healthContentRepository;

    private final UserRepository userRepository;

    public Page<AdminContentResponse> getContents(
            String keyword,
            ContentCategory category,
            ContentStatus status,
            Pageable pageable
    ) {
        Specification<HealthContent> spec =
                Specification.unrestricted();

        if (keyword != null && !keyword.isBlank()) {
            String normalizedKeyword =
                    keyword.trim().toLowerCase();

            spec = spec.and((root, query, cb) ->
                    cb.or(
                            cb.like(
                                    cb.lower(root.get("title")),
                                    "%" + normalizedKeyword + "%"
                            ),
                            cb.like(
                                    cb.lower(root.get("summary")),
                                    "%" + normalizedKeyword + "%"
                            )
                    )
            );
        }

        if (category != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(
                            root.get("category"),
                            category
                    )
            );
        }

        if (status != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(
                            root.get("status"),
                            status
                    )
            );
        }

        return healthContentRepository
                .findAll(spec, pageable)
                .map(AdminContentResponse::from);
    }

    public AdminContentResponse getContent(
            Long contentId
    ) {
        return AdminContentResponse.from(
                findContent(contentId)
        );
    }

    @Transactional
    public AdminContentResponse createContent(
            Long adminId,
            AdminContentCreateRequest request
    ) {
        User admin = findUser(adminId);

        HealthContent content =
                HealthContent.builder()
                        .category(request.category())
                        .title(request.title().trim())
                        .summary(
                                normalizeNullableText(
                                        request.summary()
                                )
                        )
                        .content(
                                request.content().trim()
                        )
                        .thumbnailUrl(
                                normalizeNullableText(
                                        request.thumbnailUrl()
                                )
                        )
                        .sourceUrl(
                                normalizeNullableText(
                                        request.sourceUrl()
                                )
                        )
                        .status(
                                request.status() != null
                                        ? request.status()
                                        : ContentStatus.DRAFT
                        )
                        .author(admin)
                        .build();

        HealthContent saved =
                healthContentRepository.save(content);

        return AdminContentResponse.from(saved);
    }

    @Transactional
    public AdminContentResponse updateContent(
            Long contentId,
            AdminContentUpdateRequest request
    ) {
        HealthContent content =
                findContent(contentId);

        content.update(
                request.category(),
                request.title().trim(),
                normalizeNullableText(
                        request.summary()
                ),
                request.content().trim(),
                normalizeNullableText(
                        request.thumbnailUrl()
                ),
                normalizeNullableText(
                        request.sourceUrl()
                )
        );

        return AdminContentResponse.from(content);
    }

    @Transactional
    public AdminContentResponse changeStatus(
            Long contentId,
            ContentStatus status
    ) {
        HealthContent content =
                findContent(contentId);

        if (content.getStatus() == status) {
            return AdminContentResponse.from(content);
        }

        content.changeStatus(status);

        return AdminContentResponse.from(content);
    }

    @Transactional
    public void deleteContent(
            Long contentId
    ) {
        HealthContent content =
                findContent(contentId);

        healthContentRepository.delete(content);
    }

    private HealthContent findContent(
            Long contentId
    ) {
        return healthContentRepository
                .findDetailById(contentId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "건강 콘텐츠를 찾을 수 없습니다."
                                )
                );
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "관리자 정보를 찾을 수 없습니다."
                                )
                );
    }

    private String normalizeKeyword(
            String keyword
    ) {
        if (
                keyword == null
                        || keyword.isBlank()
        ) {
            return null;
        }

        return keyword.trim();
    }

    private String normalizeNullableText(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return null;
        }

        return value.trim();
    }
}