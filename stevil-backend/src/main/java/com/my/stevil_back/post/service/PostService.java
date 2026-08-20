package com.my.stevil_back.post.service;

import com.my.stevil_back.post.dto.PostRequest;
import com.my.stevil_back.post.dto.PostResponse;
import com.my.stevil_back.post.entity.Post;
import com.my.stevil_back.post.entity.PostFile;
import com.my.stevil_back.post.entity.PostLike;
import com.my.stevil_back.post.entity.PostVote;
import com.my.stevil_back.post.entity.VoteOption;
import com.my.stevil_back.post.repository.PostLikeRepository;
import com.my.stevil_back.post.repository.PostRepository;
import com.my.stevil_back.post.repository.VoteRecordRepository;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final UserRepository userRepository;
    private final PostLikeRepository postLikeRepository;
    private final VoteRecordRepository voteRecordRepository;

    // 1. 게시글 작성
    public void createPost(PostRequest postRequest, MultipartFile file, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        if (user.isSuspended()) {
            throw new RuntimeException("활동이 정지된 계정입니다. 글을 작성할 수 없습니다.");
        }

        Post post = Post.builder()
                .category(postRequest.getCategory())
                .title(postRequest.getTitle())
                .content(postRequest.getContent())
                .author(user.getNickname())
                .authorEmail(user.getEmail())
                .notice(postRequest.isNotice())
                .allowComment(postRequest.isAllowComment())
                .allowCopy(postRequest.isAllowCopy())
                .autoSource(postRequest.isAutoSource())
                .externalLink(postRequest.getExternalLink())
                .user(user)
                .build();

        //  투표 데이터가 들어왔을 경우 투표 엔티티 생성 및 연결
        if (postRequest.getVoteTitle() != null && !postRequest.getVoteTitle().trim().isEmpty()
                && postRequest.getVoteOptions() != null && !postRequest.getVoteOptions().isEmpty()) {

            PostVote postVote = PostVote.builder()
                    .post(post)
                    .title(postRequest.getVoteTitle())
                    .allowMultiple(postRequest.isAllowMultipleVote())
                    .build();

            for (String optionContent : postRequest.getVoteOptions()) {
                if (optionContent != null && !optionContent.trim().isEmpty()) {
                    postVote.addOption(VoteOption.builder()
                            .content(optionContent)
                            .build());
                }
            }
            post.setPostVote(postVote); // 뼈대 게시글에 투표를 장착!
        }

        // 첨부 파일 처리
        if (file != null && !file.isEmpty()) {
            try {
                String os = System.getProperty("os.name").toLowerCase();
                String uploadDir = os.contains("win") ? "C:/uploads/" : "/home/ubuntu/uploads/";

                File dir = new File(uploadDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }

                String originalFilename = file.getOriginalFilename();
                String savedFilename = UUID.randomUUID() + "_" + originalFilename;
                File targetFile = new File(uploadDir + savedFilename);
                file.transferTo(targetFile);

                PostFile postFile = PostFile.builder()
                        .post(post)
                        .originalFileName(originalFilename)
                        .savedFileName(savedFilename)
                        .fileUrl("/api/uploads/" + savedFilename)
                        .fileSize(file.getSize())
                        .build();

                post.addFile(postFile);
            } catch (Exception e) {
                throw new RuntimeException("파일 업로드 및 기록 실패", e);
            }
        }

        postRepository.save(post);
    }

    // 2. 전체 게시글 조회
    @Transactional(readOnly = true)
    public Page<PostResponse> getAllPosts(Pageable pageable) {
        return postRepository
                .findAll(pageable)
                .map(PostResponse::from);
    }

    // 3. 인기글 TOP 5 조회
    @Transactional(readOnly = true)
    public List<PostResponse> getPopularPosts() {
        return postRepository.findTop5ByOrderByLikeCountDesc()
                .stream()
                .map(PostResponse::from)
                .toList();
    }

    // 4. 게시글 상세 조회 (조회수 증가)
    public PostResponse getPost(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 게시글이 없습니다."));
        post.setViewCount(post.getViewCount() + 1);
        return PostResponse.from(post);
    }

    // 5. 게시글 수정
    @Transactional
    public void updatePost(Long id, PostRequest postRequest, MultipartFile file, Long userId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 게시글이 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        if (post.getUser() == null || !post.getUser().getId().equals(userId)) {
            throw new RuntimeException("글을 수정할 권한이 없거나 정보가 누락된 게시글입니다.");
        }

        post.setTitle(postRequest.getTitle());
        post.setContent(postRequest.getContent());
        post.setCategory(postRequest.getCategory());
        post.setAllowComment(postRequest.isAllowComment());
        post.setAllowCopy(postRequest.isAllowCopy());
        post.setAutoSource(postRequest.isAutoSource());
        post.setExternalLink(postRequest.getExternalLink());

        // 새로운 파일 교체 로직
        if (file != null && !file.isEmpty()) {
            try {
                if (post.getFiles() != null) {
                    post.getFiles().clear();
                }

                String os = System.getProperty("os.name").toLowerCase();
                String uploadDir = os.contains("win") ? "C:/uploads/" : "/home/ubuntu/uploads/";

                File dir = new File(uploadDir);
                if (!dir.exists()) dir.mkdirs();

                String originalFilename = file.getOriginalFilename();
                String savedFilename = UUID.randomUUID() + "_" + originalFilename;
                File targetFile = new File(uploadDir + savedFilename);
                file.transferTo(targetFile);

                // .post(post) 연관관계 누락 복구
                PostFile postFile = PostFile.builder()
                        .post(post)
                        .originalFileName(originalFilename)
                        .savedFileName(savedFilename)
                        .fileUrl("/api/uploads/" + savedFilename)
                        .fileSize(file.getSize())
                        .build();

                post.addFile(postFile);
            } catch (Exception e) {
                throw new RuntimeException("파일 수정(업로드) 실패", e);
            }
        }
    }

    // 6. 게시글 삭제
    public void deletePost(Long id, Long userId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 게시글이 없습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        boolean isAdmin = String.valueOf(user.getRole()).equals("ROLE_ADMIN");

        if (!isAdmin && (post.getUser() == null || !post.getUser().getId().equals(userId))) {
            throw new RuntimeException("글을 삭제할 권한이 없거나 정보가 누락된 게시글입니다.");
        }

        postRepository.delete(post);
    }

    // 7. 기존 단방향 좋아요 처리
    public void likePost(Long id, String email) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));
        post.setLikeCount(post.getLikeCount() + 1);
    }

    // 8. 좋아요 토글
    @Transactional
    public boolean toggleLike(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        Optional<PostLike> existingLike = postLikeRepository.findByPostIdAndUserId(postId, user.getId());

        if (existingLike.isPresent()) {
            postLikeRepository.delete(existingLike.get());
            post.setLikeCount(post.getLikeCount() - 1);
            return false;
        } else {
            PostLike newLike = new PostLike(postId, user.getId());
            postLikeRepository.save(newLike);
            post.setLikeCount(post.getLikeCount() + 1);
            return true;
        }
    }

    public List<PostResponse> findAll() {
        return postRepository.findAll()
                .stream()
                .map(PostResponse::from)
                .toList();
    }

    public void deleteById(Long id) {
        postRepository.deleteById(id);
    }

    public Page<PostResponse> getPostsByCategory(String category, Pageable pageable) {
        return postRepository.findByCategory(category,pageable)
                .map(PostResponse::from);
    }

    public Page<PostResponse> searchPosts(
            String category,
            String searchType,
            String keyword,
            Pageable pageable
    ) {
        boolean isAllPosts = category == null
                || category.trim().isEmpty()
                || category.equals("all");

        Page<Post> posts;

        if ("title".equals(searchType)) {
            posts = isAllPosts
                    ? postRepository.findByTitleContainingIgnoreCase(keyword, pageable)
                    : postRepository.findByCategoryAndTitleContainingIgnoreCase(category, keyword, pageable);
        } else if ("content".equals(searchType)) {
            posts = isAllPosts
                    ? postRepository.findByContentContainingIgnoreCase(keyword, pageable)
                    : postRepository.findByCategoryAndContentContainingIgnoreCase(category, keyword, pageable);
        } else if ("author".equals(searchType)) {
            posts = isAllPosts
                    ? postRepository.findByAuthorContainingIgnoreCase(keyword, pageable)
                    : postRepository.findByCategoryAndAuthorContainingIgnoreCase(category, keyword, pageable);
        } else {
            posts = isAllPosts
                    ? postRepository.findAll(pageable)
                    : postRepository.findByCategory(category, pageable);
        }

        return posts.map(PostResponse::from);
    }
    @Transactional
    public void submitVote(Long postId, Long userId, List<Long> optionIds) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("가입된 회원이 아닙니다."));

        com.my.stevil_back.post.entity.PostVote postVote = post.getPostVote();
        if (postVote == null) {
            throw new RuntimeException("투표가 없는 게시글입니다.");
        }

        // 중복 투표 방지 (이미 이 투표에 참여했는지 확인)
        if (voteRecordRepository.existsByPostVoteIdAndUserId(postVote.getId(), user.getId())) {
            throw new RuntimeException("이미 이 투표에 참여하셨습니다.");
        }

        // 다중 선택 검증 (단일 투표인데 여러 개 골랐을 경우 튕겨냄)
        if (!postVote.isAllowMultiple() && optionIds.size() > 1) {
            throw new RuntimeException("복수 선택이 허용되지 않은 투표입니다.");
        }

        // 선택한 항목들 득표수 1씩 증가시키고 기록 남기기
        for (Long optionId : optionIds) {
            com.my.stevil_back.post.entity.VoteOption option = postVote.getOptions().stream()
                    .filter(o -> o.getId().equals(optionId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 투표 항목입니다."));

            option.setVoteCount(option.getVoteCount() + 1); // 득표수 1 증가

            // 투표했다는 증거(장부) 기록
            com.my.stevil_back.post.entity.VoteRecord record = com.my.stevil_back.post.entity.VoteRecord.builder()
                    .postVote(postVote)
                    .voteOption(option)
                    .user(user)
                    .build();
            voteRecordRepository.save(record);
        }
    }

    @Transactional(readOnly = true)
    public List<Long> getVotedOptionIds(Long postId, Long userId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("게시글이 존재하지 않습니다."));

        if (post.getPostVote() == null) {
            return java.util.Collections.emptyList(); // 투표가 없는 글이면 빈 리스트 반환
        }

        // 장부를 뒤져서 이 유저가 고른 항목 ID들만 쏙쏙 뽑아냄
        return voteRecordRepository.findByPostVoteIdAndUserId(post.getPostVote().getId(), userId)
                .stream()
                .map(record -> record.getVoteOption().getId())
                .toList();
    }
}