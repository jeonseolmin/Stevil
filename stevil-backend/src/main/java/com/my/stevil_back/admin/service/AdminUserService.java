package com.my.stevil_back.admin.service;

import com.my.stevil_back.admin.dto.response.AdminUserResponse;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.user.entity.enumType.UserRole;
import com.my.stevil_back.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {
    private final UserRepository userRepository;

    public Page<AdminUserResponse> getUsers(
            String keyword,
            Pageable pageable
    ) {
        String normalizedKeyword = normalizeKeyword(keyword);

        return userRepository
                .searchForAdmin(normalizedKeyword, pageable)
                .map(AdminUserResponse::from);
    }

    public AdminUserResponse getUser(Long userId) {
        return AdminUserResponse.from(findUser(userId));
    }

    @Transactional
    public AdminUserResponse changeRole(
            Long adminId,
            Long userId,
            UserRole role
    ) {
        if (adminId.equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "자신의 권한은 변경할 수 없습니다."
            );
        }

        User user = findUser(userId);
        user.changeRole(role);

        return AdminUserResponse.from(user);
    }

    @Transactional
    public AdminUserResponse suspendUser(
            Long adminId,
            Long userId,
            String reason
    ) {
        if (adminId.equals(userId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "자신의 계정은 정지할 수 없습니다."
            );
        }

        User user = findUser(userId);

        if (user.isSuspended()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "이미 정지된 회원입니다."
            );
        }

        user.suspend(reason.trim());

        return AdminUserResponse.from(user);
    }

    @Transactional
    public AdminUserResponse releaseSuspension(Long userId) {
        User user = findUser(userId);

        if (!user.isSuspended()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "정지 상태가 아닌 회원입니다."
            );
        }

        user.releaseSuspension();

        return AdminUserResponse.from(user);
    }

    private User findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "회원을 찾을 수 없습니다."
                ));
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }

        return keyword.trim();
    }
}