package site.aiion.api.account.alert;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "account_alerts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Alert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id", nullable = false)
    private Long accountId; // Account 테이블의 ID 참조

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "alarm_enabled", nullable = false)
    @Builder.Default
    private Boolean alarmEnabled = false; // 알람 활성화 여부

    @Column(name = "alarm_date")
    private LocalDate alarmDate; // 알람 날짜

    @Column(name = "alarm_time")
    private LocalTime alarmTime; // 알람 시간

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

