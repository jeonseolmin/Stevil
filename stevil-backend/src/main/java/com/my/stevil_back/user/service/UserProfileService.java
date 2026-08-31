package com.my.stevil_back.user.service;

import com.my.stevil_back.comment.repository.CommentRepository;
import com.my.stevil_back.post.repository.PostRepository;
import com.my.stevil_back.user.dto.response.UserProfileResponse;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserProfileService {

    private final UserRepository userRepository;

    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    public UserProfileResponse getProfileByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        LocalDate joinDate = user.getCreatedAt() != null
                ? user.getCreatedAt().toLocalDate()
                : LocalDate.now();

        int medicationDays = 120; // 임시 데이터

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

        // User 엔티티에 만들어둔 updateBio 메서드 호출 (없다면 user.setBio(bio) 사용)
        user.updateBio(bio);
    }
}