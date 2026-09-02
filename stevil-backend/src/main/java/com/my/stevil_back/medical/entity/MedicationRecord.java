package com.my.stevil_back.medical.entity;

import com.my.stevil_back.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "medication_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class MedicationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 유저의 기록인지 연결
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 복용 날짜
    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    // 실제 복용 여부 (true: 먹음, false: 안 먹음)
    @Column(name = "is_taken", nullable = false)
    private boolean isTaken;
}