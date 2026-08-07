package com.my.stevil_back.user.entity;

import com.my.stevil_back.auth.social.entity.SocialAccount;
import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import com.my.stevil_back.user.entity.enumType.Sex;
import com.my.stevil_back.user.entity.enumType.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_users_provider_provider_id",
                        columnNames = {"provider", "provider_id"}
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProviderType provider;

    @Column(name = "provider_id", nullable = false, length = 255)
    private String providerId;

    @Column(name = "profile_image", length = 1000)
    private String profileImage;

    @OneToMany(mappedBy = "user")
    private List<SocialAccount> socialAccounts = new ArrayList<>();
}
