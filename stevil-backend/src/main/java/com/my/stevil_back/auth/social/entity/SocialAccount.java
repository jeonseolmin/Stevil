package com.my.stevil_back.auth.social.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.user.entity.User;
import com.my.stevil_back.auth.social.entity.enumType.ProviderType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(
        name = "social_accounts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_social_provider_user_id",
                        columnNames = {"provider", "provider_user_id"}
                )
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SocialAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProviderType provider;

    @Column(name = "provider_user_id", nullable = false, length = 255)
    private String providerUserId;

    @Column(name = "provider_email", length = 255)
    private String providerEmail;

    private SocialAccount(
            User user,
            ProviderType provider,
            String providerUserId,
            String providerEmail
    ) {
        this.user = user;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.providerEmail = providerEmail;
    }

    public static SocialAccount create(
            User user,
            ProviderType provider,
            String providerUserId,
            String providerEmail
    ) {
        return new SocialAccount(
                user,
                provider,
                providerUserId,
                providerEmail
        );
    }

    public void updateProviderEmail(String providerEmail) {
        this.providerEmail = providerEmail;
    }
}
