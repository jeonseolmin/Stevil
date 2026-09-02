package com.my.stevil_back.planner;

import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity @Getter @NoArgsConstructor
@Table(name="weekly_plans",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","week_start"}))
public class WeeklyPlan {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="user_id",nullable=false) private Long userId;
    @Column(name="week_start",nullable=false) private LocalDate weekStart;
    @Column(nullable=false) private long revision;
    @Column(nullable=false,columnDefinition="text") private String payload;
    public WeeklyPlan(Long userId, LocalDate weekStart) {this.userId=userId;this.weekStart=weekStart;}
    public void update(String payload) {this.payload=payload;this.revision++;}
}
