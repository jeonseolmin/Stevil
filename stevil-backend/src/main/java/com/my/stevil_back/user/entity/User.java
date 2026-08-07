package com.my.stevil_back.user.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import com.my.stevil_back.user.entity.enumType.ProviderType;
import com.my.stevil_back.user.entity.enumType.UserRole;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name="users")

public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;
    private String phoneNumber;
    private String nickname;
    private String profileImage;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    private ProviderType provide;

    @Column(name = "provider_id")
    private String providerId;

    @Column(nullable = false)
    private boolean isSuspended = false;
}
