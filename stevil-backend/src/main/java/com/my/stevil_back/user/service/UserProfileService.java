package com.my.stevil_back.user.service;

import com.my.stevil_back.comment.repository.CommentRepository;
import com.my.stevil_back.post.repository.PostRepository;
import com.my.stevil_back.medical.repository.InjectionLogRepository;
import com.my.stevil_back.user.dto.response.UserProfileResponse;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.my.stevil_back.post.dto.PostResponse;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final InjectionLogRepository injectionLogRepository;

    public UserProfileResponse getProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        LocalDate joinDate = user.getCreatedAt() != null
                ? user.getCreatedAt().toLocalDate()
                : LocalDate.now();

        int medicationDays = (int) injectionLogRepository.countByUserId(user.getId());

        int postCount = (int) postRepository.countByAuthorEmail(email);
        int commentCount = (int) commentRepository.countByAuthorEmail(email);

        return new UserProfileResponse(
                user.getId(),
                user.getNickname(),
                user.getProfileImage(),
                joinDate,
                medicationDays,
                user.getBio(),
                postCount,
                commentCount
        );
    }

    @Transactional
    public void updateUserBio(String email, String bio) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));
        user.updateBio(bio);
    }

    public Page<PostResponse> getMyPosts(String email, int page) {
        // page 파라미터를 받아 한 페이지당 10개씩 최신순으로 가져옵니다.
        return postRepository.findByAuthorEmailOrderByIdDesc(email, PageRequest.of(page, 10))
                .map(PostResponse::from); // Page 객체는 stream 없이 바로 map()을 쓸 수 있습니다!
    }
}