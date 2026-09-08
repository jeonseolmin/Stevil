package com.my.stevil_back.content.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.content.dto.request.AdminContentCreateRequest;
import com.my.stevil_back.content.dto.request.AdminContentStatusRequest;
import com.my.stevil_back.content.dto.request.AdminContentUpdateRequest;
import com.my.stevil_back.content.dto.response.AdminContentResponse;
import com.my.stevil_back.content.entity.enumType.ContentCategory;
import com.my.stevil_back.content.entity.enumType.ContentStatus;
import com.my.stevil_back.content.service.AdminContentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import static org.springframework.data.domain.Sort.Direction.DESC;

@RestController
@RequestMapping("/api/admin/contents")
@RequiredArgsConstructor
public class AdminContentController {

    private final AdminContentService
            adminContentService;

    @GetMapping
    public ResponseEntity<Page<AdminContentResponse>>
    getContents(

            @RequestParam(required = false)
            String keyword,

            @RequestParam(required = false)
            ContentCategory category,

            @RequestParam(required = false)
            ContentStatus status,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = DESC
            )
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                adminContentService.getContents(
                        keyword,
                        category,
                        status,
                        pageable
                )
        );
    }

    @GetMapping("/{contentId}")
    public ResponseEntity<AdminContentResponse>
    getContent(
            @PathVariable Long contentId
    ) {
        return ResponseEntity.ok(
                adminContentService.getContent(
                        contentId
                )
        );
    }

    @PostMapping
    public ResponseEntity<AdminContentResponse>
    createContent(

            @AuthenticationPrincipal
            CustomUserDetails admin,

            @Valid
            @RequestBody
            AdminContentCreateRequest request
    ) {
        return ResponseEntity.ok(
                adminContentService.createContent(
                        admin.getUserId(),
                        request
                )
        );
    }

    @PutMapping("/{contentId}")
    public ResponseEntity<AdminContentResponse>
    updateContent(

            @PathVariable
            Long contentId,

            @Valid
            @RequestBody
            AdminContentUpdateRequest request
    ) {
        return ResponseEntity.ok(
                adminContentService.updateContent(
                        contentId,
                        request
                )
        );
    }

    @PatchMapping("/{contentId}/status")
    public ResponseEntity<AdminContentResponse>
    changeStatus(

            @PathVariable
            Long contentId,

            @Valid
            @RequestBody
            AdminContentStatusRequest request
    ) {
        return ResponseEntity.ok(
                adminContentService.changeStatus(
                        contentId,
                        request.status()
                )
        );
    }

    @DeleteMapping("/{contentId}")
    public ResponseEntity<Void>
    deleteContent(
            @PathVariable Long contentId
    ) {
        adminContentService.deleteContent(
                contentId
        );

        return ResponseEntity.noContent().build();
    }
}