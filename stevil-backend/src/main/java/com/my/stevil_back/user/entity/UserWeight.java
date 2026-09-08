package com.my.stevil_back.user.entity;

import com.my.stevil_back.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_weight")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserWeight extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    @Column(name = "target_weight", precision = 5, scale = 2)
    private java.math.BigDecimal targetWeight; // 목표 체중

    @Column(length = 10)
    private String unit = "kg";

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    public static UserWeight create(
            User user,
            BigDecimal weight,
            BigDecimal targetWeight
    ) {
        return create(user, weight, targetWeight, LocalDateTime.now());
    }

    // 2. 프론트엔드의 측정 시간을 반영하는 메서드
    public static UserWeight create(
            User user,
            BigDecimal weight,
            BigDecimal targetWeight,
            LocalDateTime recordedAt
    ) {
        UserWeight userWeight = new UserWeight();
        userWeight.user = user;
        userWeight.weight = weight;
        userWeight.targetWeight = targetWeight;
        userWeight.unit = "kg";
        userWeight.recordedAt = recordedAt != null ? recordedAt : LocalDateTime.now();

        return userWeight;
    }
}