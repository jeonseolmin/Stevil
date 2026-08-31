package com.my.stevil_back.user.entity;

import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.user.entity.enumType.Sex;
import com.my.stevil_back.user.entity.enumType.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "users"
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 255)
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false, length = 50)
    private String nickname;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Sex sex;

    @Column(name = "height_cm")
    private Double heightCm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "profile_image", length = 1000)
    private String profileImage;

    @OneToMany(mappedBy = "user")
    private List<SocialAccount> socialAccounts = new ArrayList<>();

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted = false;

    @Column(name = "is_suspended", nullable = false)
    private boolean suspended = false;

    @Column(name = "suspended_at")
    private LocalDateTime suspendedAt;

    @Column(name = "suspension_reason", length = 500)
    private String suspensionReason;

    @Column(length = 100)
    private String bio; // 한 줄 소개

    @Builder
    private User(
            String email,
            String passwordHash,
            String nickname,
            LocalDate birthDate,
            Sex sex,
            Double heightCm,
            UserRole role,
            String profileImage,
            Boolean onboardingCompleted
    ) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
        this.birthDate = birthDate;
        this.sex = sex;
        this.heightCm = heightCm;
        this.role = role != null ? role : UserRole.ROLE_USER;
        this.profileImage = profileImage;
        this.onboardingCompleted = Boolean.TRUE.equals(onboardingCompleted);
    }

    public void updateProfile(
            String nickname,
            LocalDate birthDate,
            Sex sex,
            Double heightCm,
            String profileImage
    ) {
        this.nickname = nickname;
        this.birthDate = birthDate;
        this.sex = sex;
        this.heightCm = heightCm;
        this.profileImage = profileImage;
    }
    public void completeOnboarding(
            String nickname,
            LocalDate birthDate,
            Sex sex,
            Double heightCm
    ) {
        this.nickname = nickname;
        this.birthDate = birthDate;
        this.sex = sex;
        this.heightCm = heightCm;
        this.onboardingCompleted = true;
    }

    public void changeRole(UserRole role) {
        this.role = role;
    }

    public void suspend(String reason) {
        this.suspended = true;
        this.suspendedAt = LocalDateTime.now();
        this.suspensionReason = reason;
    }

    public void releaseSuspension() {
        this.suspended = false;
        this.suspendedAt = null;
        this.suspensionReason = null;
    }

    public void updateBio(String bio) {
        this.bio = bio;
    }
}
