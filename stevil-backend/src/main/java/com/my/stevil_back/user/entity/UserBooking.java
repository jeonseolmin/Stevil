package com.my.stevil_back.user.entity;

import com.my.stevil_back.user.entity.enumType.BookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name="user_bookings")
public class UserBooking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String bookingNumber; // 예약 번호

    // @ManyToOne : 여러(Many) 예약이 하나의(One) User를 참조(연결)
    // fetch = FetchType.LAZY : 지연 로딩. 유저 정보까지 가져오는 것을 막아줌.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status; // 예약 상태

    @Column(nullable = false)
    private BigDecimal totalPrice; // 총 결제 금액

    private LocalDate startDate; // 체크인 / 시작일
    private LocalDate endDate;   // 체크아웃 / 종료일
    private Integer itemCount;   // 인원수 또는 수량

    // 예약자 / 이용자 정보
    private String bookerName;
    private String bookerPhone;
    private String bookerEmail;

    @Column(columnDefinition = "TEXT")
    private String specialRequests; // 요청사항
}
