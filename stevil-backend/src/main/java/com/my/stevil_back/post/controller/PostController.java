package com.my.stevil_back.post.controller;

import com.my.stevil_back.common.security.oauth.entity.CustomUserDetails;
import com.my.stevil_back.post.dto.PostRequest;
import com.my.stevil_back.post.dto.PostResponse;
import com.my.stevil_back.post.dto.VoteRequest;
import com.my.stevil_back.post.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/community")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    // 1. 게시글 목록 불러오기 (공지 상단 고정)
    @GetMapping
    public ResponseEntity<Page<PostResponse>> getPosts(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String searchType,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Sort sort = Sort.by(Sort.Direction.DESC, "notice")
                .and(Sort.by(Sort.Direction.DESC, "id"));

        Pageable pageable = PageRequest.of(page, size, sort);

        if (keyword != null && !keyword.trim().isEmpty()) {
            return ResponseEntity.ok(
                    postService.searchPosts(category, searchType, keyword, pageable)
            );
        }

        if (category != null && !category.trim().isEmpty() && !category.equals("all")) {
            return ResponseEntity.ok(
                    postService.getPostsByCategory(category, pageable)
            );
        }

        return ResponseEntity.ok(postService.getAllPosts(pageable));
    }

    // 2. 홈 화면 인기글 TOP 5 불러오기
    @GetMapping("/popular")
    public ResponseEntity<List<PostResponse>> getPopularPosts() {
        return ResponseEntity.ok(postService.getPopularPosts());
    }

    // 3. 게시글 상세 보기
    @GetMapping("/{id}")
    public ResponseEntity<PostResponse> getPost(@PathVariable Long id) {
        return ResponseEntity.ok(postService.getPost(id));
    }

    // 4. 게시글 작성
    @PostMapping
    public ResponseEntity<String> writePost(
            @ModelAttribute PostRequest postRequest,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.createPost(postRequest, file, userDetails.getUserId());
        return ResponseEntity.ok("게시글이 성공적으로 등록되었습니다.");
    }

    // 5. 게시글 수정
    @PostMapping("/{id}")
    public ResponseEntity<String> updatePost(
            @PathVariable Long id,
            @ModelAttribute PostRequest postRequest,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.updatePost(id, postRequest, file, userDetails.getUserId());
        return ResponseEntity.ok("게시글이 성공적으로 수정되었습니다.");
    }

    // 6. 게시글 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.deletePost(id, userDetails.getUserId());
        return ResponseEntity.ok("게시글이 성공적으로 삭제되었습니다.");
    }

    // 7. 게시글 좋아요 토글
    @PostMapping("/{id}/like")
    public ResponseEntity<Boolean> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        boolean isNowLiked = postService.toggleLike(id, userDetails.getUserId());
        return ResponseEntity.ok(isNowLiked);
    }

    @PostMapping("/{id}/vote")
    public ResponseEntity<?> submitVote(
            @PathVariable Long id,
            @RequestBody VoteRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        try {
            // 회원님이 만들어두신 getUserId() 메서드를 바로 사용!
            postService.submitVote(id, userDetails.getUserId(), request.getOptionIds());
            return ResponseEntity.ok().body("투표가 완료되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/{id}/vote/check")
    public ResponseEntity<List<Long>> checkVoteStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        // 비회원이거나 로그인 정보가 없으면 투표 안 한 걸로 처리(빈 리스트)
        if (userDetails == null) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }

        List<Long> votedOptionIds = postService.getVotedOptionIds(id, userDetails.getUserId());
        return ResponseEntity.ok(votedOptionIds);
    }
}